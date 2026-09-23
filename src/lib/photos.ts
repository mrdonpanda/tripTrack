import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Angle } from './angles';
import { syncAlbumUrl } from './api';
import { LOT_PHOTOS_BUCKET, photoObjectPath, photoPublicUrl, storagePathFromPublicUrl } from './lotPhotos';
import { supabase } from './supabase';
import type { UploadJob } from './uploadQueue';

async function readLocalBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not read the photo');
    return response.arrayBuffer();
  }
  return new File(uri).arrayBuffer();
}

async function lotPhotoTarget(carId: string, tripId: string, angle: Angle): Promise<string> {
  const { data: car, error: carError } = await supabase
    .from('cars')
    .select('lot_number')
    .eq('id', carId)
    .maybeSingle();
  if (carError) throw new Error(carError.message);
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('trip_date')
    .eq('id', tripId)
    .maybeSingle();
  if (tripError) throw new Error(tripError.message);
  return photoObjectPath(String(trip?.trip_date ?? ''), String(car?.lot_number ?? ''), angle);
}

async function moveObject(from: string, to: string): Promise<void> {
  if (from === to) return;
  const { error } = await supabase.storage.from(LOT_PHOTOS_BUCKET).move(from, to);
  if (error) throw new Error(error.message);
}

export async function uploadJpeg(job: UploadJob, jpegUri: string): Promise<void> {
  const path = await lotPhotoTarget(job.carId, job.tripId, job.angle);
  const url = photoPublicUrl(path);
  if (job.imageUrl !== url) {
    const body = await readLocalBytes(jpegUri);
    const previous = job.imageUrl ? storagePathFromPublicUrl(job.imageUrl) : null;
    const { error: uploadError } = await supabase.storage.from(LOT_PHOTOS_BUCKET).upload(path, body, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (uploadError) throw new Error(uploadError.message);
    const finalPath = await lotPhotoTarget(job.carId, job.tripId, job.angle);
    if (finalPath !== path) await moveObject(path, finalPath);
    if (previous && previous !== finalPath && previous !== path) {
      await supabase.storage.from(LOT_PHOTOS_BUCKET).remove([previous]);
    }
    job.imageUrl = photoPublicUrl(finalPath);
  }

  const { error: rowError } = await supabase.from('photos').upsert(
    {
      user_id: job.userId,
      car_id: job.carId,
      angle: job.angle,
      image_url: job.imageUrl,
    },
    { onConflict: 'car_id,angle' },
  );
  if (rowError) throw new Error(rowError.message);
  await syncAlbumUrl(job.tripId);

  if (Platform.OS !== 'web' && jpegUri.includes('upload-queue')) {
    try {
      new File(jpegUri).delete();
    } catch {
      // The lot chip falls back to the public storage URL after the trip reloads.
    }
  }
}

export async function relocateCarPhotos(carId: string): Promise<void> {
  const { data: car, error: carError } = await supabase.from('cars').select('trip_id, lot_number').eq('id', carId).maybeSingle();
  if (carError) throw new Error(carError.message);
  if (!car) return;
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('trip_date')
    .eq('id', car.trip_id)
    .maybeSingle();
  if (tripError) throw new Error(tripError.message);
  if (!trip) return;
  const { data: photos, error: photoError } = await supabase
    .from('photos')
    .select('id, angle, image_url')
    .eq('car_id', carId);
  if (photoError) throw new Error(photoError.message);

  let moved = false;
  for (const photo of photos ?? []) {
    const row = photo as { id: string; angle: Angle; image_url: string };
    let desired: string;
    try {
      desired = photoObjectPath(String(trip.trip_date), String(car.lot_number ?? ''), row.angle);
    } catch (err) {
      if (err instanceof Error && err.name === 'WaitingForLotNumber') continue;
      throw err;
    }
    const current = storagePathFromPublicUrl(row.image_url);
    if (!current || current === desired) continue;
    await moveObject(current, desired);
    const imageUrl = photoPublicUrl(desired);
    const { error: updateError } = await supabase.from('photos').update({ image_url: imageUrl }).eq('id', row.id);
    if (updateError) throw new Error(updateError.message);
    moved = true;
  }
  if (moved) await syncAlbumUrl(String(car.trip_id));
}
