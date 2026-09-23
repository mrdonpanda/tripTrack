import { ANGLE_FILE_TAG, type Angle } from './angles';

export const LOT_PHOTOS_BUCKET = 'lotPhotos';
export const LOT_PHOTOS_PUBLIC_BASE = 'https://db.orale.boo/storage/v1/object/public/lotPhotos/';

export class WaitingForLotNumber extends Error {
  constructor() {
    super('Enter the lot number before this photo can send');
    this.name = 'WaitingForLotNumber';
  }
}

export function sanitizeLotNumber(lotNumber: string): string {
  return lotNumber.trim().replace(/[^\w.-]+/g, '');
}

export function photoObjectPath(tripDate: string, lotNumber: string, angle: Angle): string {
  const lot = sanitizeLotNumber(lotNumber);
  if (!lot) throw new WaitingForLotNumber();
  const date = tripDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Trip date is missing');
  return `${date}/${lot}_${ANGLE_FILE_TAG[angle]}.jpg`;
}

export function photoPublicUrl(storagePath: string): string {
  const encoded = storagePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${LOT_PHOTOS_PUBLIC_BASE}${encoded}`;
}

export function storagePathFromPublicUrl(url: string): string | null {
  if (!url.startsWith(LOT_PHOTOS_PUBLIC_BASE)) return null;
  const rest = url.slice(LOT_PHOTOS_PUBLIC_BASE.length);
  if (!rest) return null;
  return rest
    .split('/')
    .map((part) => decodeURIComponent(part))
    .join('/');
}
