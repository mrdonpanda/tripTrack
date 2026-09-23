jest.mock('react-native-volume-manager', () => ({
  VolumeManager: {
    getVolume: jest.fn(),
    setVolume: jest.fn(),
    showNativeVolumeUI: jest.fn(),
    addVolumeListener: jest.fn(),
  },
}));

import { startVolumeShutter, type VolumeApi } from '../src/lib/volumeShutter';

function fakeVolume(): VolumeApi & {
  presses: Array<() => void>;
  removed: boolean;
  ui: boolean[];
  volumes: number[];
} {
  const presses: Array<() => void> = [];
  const ui: boolean[] = [];
  const volumes: number[] = [];
  return {
    presses,
    removed: false,
    ui,
    volumes,
    async getVolume() {
      return { volume: 0.2 };
    },
    async setVolume(value) {
      volumes.push(value);
    },
    async showNativeVolumeUI(config) {
      ui.push(config.enabled);
    },
    addVolumeListener(callback) {
      presses.push(() => callback({ volume: 0.3 }));
      return {
        remove: () => {
          this.removed = true;
        },
      };
    },
  };
}

describe('volume shutter', () => {
  it('takes a photo on a volume press and restores normal volume control afterwards', async () => {
    const api = fakeVolume();
    const shots: number[] = [];
    const shutter = await startVolumeShutter(() => {
      shots.push(1);
    }, api);

    expect(api.ui).toEqual([false]);
    api.presses[0]();
    expect(shots).toEqual([1]);
    expect(api.volumes[api.volumes.length - 1]).toBe(0.2);

    shutter.stop();
    expect(api.removed).toBe(true);
    expect(api.ui[api.ui.length - 1]).toBe(true);
    expect(api.volumes[api.volumes.length - 1]).toBe(0.2);
  });
});
