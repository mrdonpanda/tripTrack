import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import type { NewUploadJob } from './uploadQueue';
import { supabase } from './supabase';

async function readLocalBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not read the photo');
    return response.arrayBuffer();
  }
  return new File(uri).arrayBuffer();
}

export async function uploadJpeg(job: NewUploadJob, jpegUri: string): Promise<void> {
  const body = await readLocalBytes(jpegUri);
  const { error: uploadError } = await supabase.storage.from('trip-photos').upload(job.storagePath, body, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { error: rowError } = await supabase.from('photos').upsert(
    {
      user_id: job.userId,
      car_id: job.carId,
      angle: job.angle,
      storage_path: job.storagePath,
    },
    { onConflict: 'car_id,angle' },
  );
  if (rowError) throw new Error(rowError.message);

  if (Platform.OS !== 'web' && jpegUri.includes('upload-queue')) {
    try {
      new File(jpegUri).delete();
    } catch {
      // The preview can fall back to the public URL.
    }
  }
}
