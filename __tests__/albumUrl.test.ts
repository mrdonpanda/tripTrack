import { albumUrlFromPhotos } from '../src/lib/albumUrl';

describe('album share text', () => {
  it('orders direct image urls by car position and angle', () => {
    const url = albumUrlFromPhotos(
      [
        { id: 'car-b', position: 2 },
        { id: 'car-a', position: 1 },
      ],
      [
        { car_id: 'car-b', angle: 'front', image_url: 'https://db.orale.boo/storage/v1/object/public/lotPhotos/2026-09-22/200_front.jpg' },
        { car_id: 'car-a', angle: 'keys', image_url: 'https://db.orale.boo/storage/v1/object/public/lotPhotos/2026-09-22/100_keys.jpg' },
        { car_id: 'car-a', angle: 'top', image_url: 'https://db.orale.boo/storage/v1/object/public/lotPhotos/2026-09-22/100_top.jpg' },
        { car_id: 'gone', angle: 'top', image_url: 'https://db.orale.boo/storage/v1/object/public/lotPhotos/2026-09-22/gone_top.jpg' },
      ],
    );
    expect(url).toBe(
      [
        'https://db.orale.boo/storage/v1/object/public/lotPhotos/2026-09-22/100_top.jpg',
        'https://db.orale.boo/storage/v1/object/public/lotPhotos/2026-09-22/100_keys.jpg',
        'https://db.orale.boo/storage/v1/object/public/lotPhotos/2026-09-22/200_front.jpg',
      ].join(
        '\n',
      ),
    );
  });

  it('returns null when the trip has no uploaded photos', () => {
    expect(albumUrlFromPhotos([{ id: 'car-a', position: 1 }], [])).toBeNull();
  });
});
