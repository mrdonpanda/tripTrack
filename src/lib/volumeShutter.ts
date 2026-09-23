import { Platform } from 'react-native';
import { VolumeManager } from 'react-native-volume-manager';

type VolumeListener = { remove: () => void };

export type VolumeApi = {
  getVolume: () => Promise<{ volume: number }>;
  setVolume: (value: number, config?: { type?: 'music'; showUI?: boolean; playSound?: boolean }) => Promise<void>;
  showNativeVolumeUI: (config: { enabled: boolean }) => Promise<void>;
  addVolumeListener: (callback: (result: { volume: number }) => void) => VolumeListener;
};

const nativeVolumeApi: VolumeApi = {
  getVolume: () => VolumeManager.getVolume(),
  setVolume: (value, config) => VolumeManager.setVolume(value, config),
  showNativeVolumeUI: (config) => VolumeManager.showNativeVolumeUI(config),
  addVolumeListener: (callback) => VolumeManager.addVolumeListener(callback),
};

export async function startVolumeShutter(onPress: () => void, api: VolumeApi = nativeVolumeApi): Promise<{ stop: () => void }> {
  if (Platform.OS === 'web') return { stop() {} };

  const current = await api.getVolume();
  const original = typeof current.volume === 'number' ? current.volume : 0.5;
  const holdAt = original > 0.05 && original < 0.95 ? original : 0.5;
  await api.setVolume(holdAt, { type: 'music', showUI: false, playSound: false });
  await api.showNativeVolumeUI({ enabled: false });

  let restoring = false;
  let lastPress = 0;
  const listener = api.addVolumeListener(() => {
    if (restoring) return;
    const now = Date.now();
    if (now - lastPress < 500) return;
    lastPress = now;
    restoring = true;
    void api.setVolume(holdAt, { type: 'music', showUI: false, playSound: false }).finally(() => {
      restoring = false;
    });
    onPress();
  });

  return {
    stop() {
      listener.remove();
      void api.showNativeVolumeUI({ enabled: true });
      void api.setVolume(original, { type: 'music', showUI: false, playSound: false });
    },
  };
}
