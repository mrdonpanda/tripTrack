import { Album, Asset, getPermissionsAsync, requestPermissionsAsync, type GranularPermission } from 'expo-media-library';
import { Linking, Platform } from 'react-native';

export const TRIP_ALBUM = 'TripTracker';

const photoPermission: GranularPermission[] = ['photo'];

export class DeviceAlbumPermissionError extends Error {
  constructor() {
    super('Allow photo storage to keep a copy in the TripTracker album');
    this.name = 'DeviceAlbumPermissionError';
  }
}

export async function ensureDeviceAlbumPermission(openSettings = false): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const current = await getPermissionsAsync(false, photoPermission);
  if (current.granted) return true;
  if (!current.canAskAgain) {
    if (openSettings) await Linking.openSettings();
    return false;
  }
  const next = await requestPermissionsAsync(false, photoPermission);
  return next.granted === true;
}

export async function saveToTripAlbum(uri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const allowed = await ensureDeviceAlbumPermission();
  if (!allowed) throw new DeviceAlbumPermissionError();
  try {
    await addToTripAlbum(uri);
  } catch (err) {
    const existing = await Album.get(TRIP_ALBUM);
    if (!existing) throw err;
    await Asset.create(uri, existing);
  }
}

async function addToTripAlbum(uri: string): Promise<void> {
  const existing = await Album.get(TRIP_ALBUM);
  if (existing) {
    await Asset.create(uri, existing);
    return;
  }
  await Album.create(TRIP_ALBUM, [uri], false);
}
