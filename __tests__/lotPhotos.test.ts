import { photoObjectPath, photoPublicUrl, storagePathFromPublicUrl, WaitingForLotNumber } from '../src/lib/lotPhotos';

describe('lot photo paths', () => {
  it('names files by trip date, lot number, and angle tag', () => {
    expect(photoObjectPath('2026-09-22', '123456', 'top')).toBe('2026-09-22/123456_top.jpg');
    expect(photoObjectPath('2026-09-22', '123456', 'front')).toBe('2026-09-22/123456_front.jpg');
    expect(photoObjectPath('2026-09-22', '123456', 'driver_side')).toBe('2026-09-22/123456_driver.jpg');
    expect(photoObjectPath('2026-09-22', '123456', 'back')).toBe('2026-09-22/123456_back.jpg');
    expect(photoObjectPath('2026-09-22', '123456', 'passenger_side')).toBe('2026-09-22/123456_passenger.jpg');
    expect(photoObjectPath('2026-09-22', '123456', 'keys')).toBe('2026-09-22/123456_keys.jpg');
    expect(photoObjectPath('2026-09-22', '123456', 'under_vehicle')).toBe('2026-09-22/123456_under.jpg');
  });

  it('builds the public lotPhotos url and reads the path back', () => {
    const path = '2026-09-22/123456_top.jpg';
    const url = photoPublicUrl(path);
    expect(url).toBe('https://db.orale.boo/storage/v1/object/public/lotPhotos/2026-09-22/123456_top.jpg');
    expect(storagePathFromPublicUrl(url)).toBe(path);
  });

  it('waits for a lot number instead of uploading a blank name', () => {
    expect(() => photoObjectPath('2026-09-22', '   ', 'top')).toThrow(WaitingForLotNumber);
  });
});
