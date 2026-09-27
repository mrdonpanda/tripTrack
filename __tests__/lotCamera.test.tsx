import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PermissionsAndroid, Platform } from 'react-native';

import { LotWorkspace } from '../src/components/LotWorkspace';
import { Screen } from '../src/components/ui';

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: () => (props: object) => React.createElement(View, props),
    },
  );
});
import { UploadQueueProvider } from '../src/lib/queueContext';
import { createUploadQueue, memoryStorage, type UploadJob } from '../src/lib/uploadQueue';

jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
  Album: {
    get: jest.fn(async () => null),
    create: jest.fn(async () => ({ id: 'album' })),
  },
  Asset: {
    create: jest.fn(async () => ({ id: 'asset' })),
  },
}));

jest.mock('react-native-volume-manager', () => ({
  VolumeManager: {
    getVolume: jest.fn(async () => ({ volume: 0.4 })),
    setVolume: jest.fn(async () => undefined),
    showNativeVolumeUI: jest.fn(async () => undefined),
    addVolumeListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('expo-camera', () => {
  const React = require('react') as typeof import('react');
  const { View: NativeView } = require('react-native') as typeof import('react-native');
  const CameraView = React.forwardRef((props: { testID?: string }, ref: React.Ref<{ takePictureAsync: () => Promise<{ uri: string; width: number; height: number }> }>) => {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: jest.fn(async () => ({ uri: 'file://capture.jpg', width: 4032, height: 3024 })),
    }));
    return React.createElement(NativeView, props);
  });
  return {
    CameraView,
    useCameraPermissions: () => [
      { granted: true, canAskAgain: true, status: 'granted' },
      jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
      jest.fn(),
    ],
    Camera: {
      requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
      getAvailableCameraDevicesAsync: jest.fn(async () => [
        { id: 'wide-back', position: 'back', lensType: 'wide', name: 'Back Wide', minFocalLength: 5.4, focalLengths: [5.4], minZoom: 1 },
        {
          id: 'ultra-back',
          position: 'back',
          lensType: 'ultrawide',
          name: 'Back Ultra Wide Camera',
          minFocalLength: 2.2,
          focalLengths: [2.2],
          minZoom: 0.6,
        },
        { id: 'front', position: 'front', lensType: 'wide', name: 'Front', minFocalLength: 3, focalLengths: [3], minZoom: 1 },
      ]),
    },
  };
});

const { Camera } = require('expo-camera') as {
  Camera: { getAvailableCameraDevicesAsync: jest.Mock };
};

async function renderLot(queue = createQueue()) {
  await render(
    <UploadQueueProvider queue={queue}>
      <Screen>
        <LotWorkspace
          userId="user-1"
          tripId="trip-1"
          cars={[{ id: 'car-1', position: 1, lot_number: '' }]}
          photos={[]}
          onLotChange={jest.fn()}
          onAddCar={jest.fn()}
          onRemoveLastCar={jest.fn()}
        />
      </Screen>
    </UploadQueueProvider>,
  );
  return queue;
}

function createQueue() {
  const releases: Array<() => void> = [];
  const queue = createUploadQueue({
    compress: (job) =>
      new Promise((resolve) => {
        releases.push(() => resolve({ uri: `file://jpeg-${job.id}.jpg` }));
      }),
    upload: async () => undefined,
    storage: memoryStorage(),
    sleep: async () => undefined,
    now: () => 0,
  });
  return Object.assign(queue, { releases });
}

describe('lot camera', () => {
  beforeEach(() => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('opens the ultrawide camera and lets the driver shoot the next angle while the upload is still queued', async () => {
    const queue = (await renderLot()) as ReturnType<typeof createQueue>;
    fireEvent.press(screen.getByText('Shoot next'));
    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });
    expect(Camera.getAvailableCameraDevicesAsync).toHaveBeenCalled();
    const camera = screen.getByTestId('camera-view');
    expect(camera.props.cameraId).toBe('ultra-back');
    expect(camera.props.zoom).toBe(0);
    expect(camera.props.useWidestZoom).toBe(true);
    expect(camera.props.facing).toBe('back');
    expect(camera.props.style.flex).toBe(1);
    expect(camera.props.style.width).toBeGreaterThan(0);
    expect(camera.props.style.height).toBeGreaterThan(0);
    expect(screen.getByTestId('camera-frame').props.style.width).toBeGreaterThan(0);
    expect(screen.getByTestId('camera-frame').props.style.height).toBeGreaterThan(0);

    fireEvent.press(screen.getByText('Take Top photo'));
    await waitFor(() => {
      expect(screen.getByTestId('chip-car-1-top')).toBeTruthy();
      expect(screen.getByText('Sending')).toBeTruthy();
    });
    expect(screen.queryByTestId('camera-view')).toBeNull();
    expect(queue.list().map((item: UploadJob) => item.angle)).toContain('top');

    fireEvent.press(screen.getByText('Shoot next'));
    await waitFor(() => {
      expect(screen.getByText('Take Front photo')).toBeTruthy();
    });
    expect(queue.list().some((item: UploadJob) => item.angle === 'top')).toBe(true);

    queue.releases.forEach((release) => release());
    await queue.whenDrained();
  });

  it('keeps the preview unmounted until android.permission.CAMERA is granted', async () => {
    const previous = Platform.OS;
    Platform.OS = 'android';
    let grant: () => void = () => undefined;
    const request = jest.spyOn(PermissionsAndroid, 'request').mockImplementation(
      () =>
        new Promise((resolve) => {
          grant = () => resolve(PermissionsAndroid.RESULTS.GRANTED);
        }),
    );
    try {
      await renderLot();
      fireEvent.press(screen.getByText('Shoot next'));
      await waitFor(() => {
        expect(request).toHaveBeenCalledWith('android.permission.CAMERA');
      });
      expect(screen.queryByTestId('camera-view')).toBeNull();
      expect(screen.getByText('Opening camera')).toBeTruthy();
      await act(async () => {
        grant();
      });
      await waitFor(() => {
        expect(screen.getByTestId('camera-view')).toBeTruthy();
      });
      const camera = screen.getByTestId('camera-view');
      expect(camera.props.style.width).toBeGreaterThan(0);
      expect(camera.props.style.height).toBeGreaterThan(0);
    } finally {
      request.mockRestore();
      Platform.OS = previous;
    }
  });
});
