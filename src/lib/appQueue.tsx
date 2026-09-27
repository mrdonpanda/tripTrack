import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo, type ReactNode } from 'react';

import { compressPhoto } from './compress';
import { saveToTripAlbum } from './deviceAlbum';
import { uploadJpeg } from './photos';
import { UploadQueueProvider } from './queueContext';
import { createUploadQueue, type QueueStorage, type UploadJob } from './uploadQueue';

function asyncStorageQueue(userId: string): QueueStorage {
  const key = `trip-tracker-upload-queue:${userId}`;
  return {
    async load() {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as UploadJob[];
      return Array.isArray(parsed) ? parsed : [];
    },
    async save(jobs) {
      await AsyncStorage.setItem(key, JSON.stringify(jobs));
    },
  };
}

export function createAppUploadQueue(userId: string) {
  return createUploadQueue({
    compress: (job) => compressPhoto(job.localUri, job.width, job.height),
    saveLocal: (_job, jpegUri) => saveToTripAlbum(jpegUri),
    upload: (job, jpegUri) => uploadJpeg(job, jpegUri),
    storage: asyncStorageQueue(userId),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
  });
}

export function AppQueueProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const queue = useMemo(() => createAppUploadQueue(userId), [userId]);
  return <UploadQueueProvider queue={queue}>{children}</UploadQueueProvider>;
}
