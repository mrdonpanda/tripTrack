import { ANGLES, type Angle } from './angles';

export function albumUrlFromPhotos(
  cars: Array<{ id: string; position: number }>,
  photos: Array<{ car_id: string; angle: string; image_url: string }>,
): string | null {
  const position = new Map(cars.map((car) => [car.id, car.position]));
  const angleIndex = new Map<string, number>(ANGLES.map((angle, index) => [angle.id, index]));
  const urls = photos
    .filter((photo) => photo.image_url.trim() && position.has(photo.car_id))
    .sort((a, b) => {
      const byCar = (position.get(a.car_id) ?? 0) - (position.get(b.car_id) ?? 0);
      if (byCar !== 0) return byCar;
      return (angleIndex.get(a.angle as Angle) ?? 0) - (angleIndex.get(b.angle as Angle) ?? 0);
    })
    .map((photo) => photo.image_url.trim());
  return urls.length ? urls.join('\n') : null;
}
