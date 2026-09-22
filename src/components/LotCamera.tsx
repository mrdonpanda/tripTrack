import { CameraView, useCameraPermissions, type CameraViewProps } from 'expo-camera';
import { useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { Pressable, Text, View } from 'react-native';

import { selectWidestBackCamera, type WidestCameraChoice } from '../lib/cameraDevices';
import { queryCameraDevices } from '../lib/cameraQuery';
import { colors } from '../theme';
import { BigButton } from './ui';

type WidestProps = CameraViewProps & {
  cameraId?: string;
  useWidestZoom?: boolean;
};

const WidestCamera = CameraView as ComponentType<WidestProps & { ref?: Ref<CameraView> }>;

function lensNames(lenses: unknown): string[] {
  if (!Array.isArray(lenses)) return [];
  return lenses
    .map((lens) => {
      if (typeof lens === 'string') return lens;
      if (lens && typeof lens === 'object') {
        const record = lens as { localizedName?: string; deviceType?: string };
        return record.localizedName || record.deviceType || '';
      }
      return '';
    })
    .filter(Boolean);
}

export function LotCamera({
  angleLabel,
  onShot,
  onClose,
}: {
  angleLabel: string;
  onShot: (photo: { uri: string; width: number; height: number }) => void;
  onClose: () => void;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [choice, setChoice] = useState<WidestCameraChoice | null>(null);
  const [lensOverride, setLensOverride] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!permission?.granted) return;
    let live = true;
    queryCameraDevices()
      .then((devices) => {
        if (live) setChoice(selectWidestBackCamera(devices));
      })
      .catch(() => {
        if (live) setChoice(selectWidestBackCamera([]));
      });
    return () => {
      live = false;
    };
  }, [permission?.granted]);

  async function shoot() {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo?.uri) throw new Error('The camera did not return a photo');
      onShot({ uri: photo.uri, width: photo.width, height: photo.height });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not take the photo');
      setBusy(false);
    }
  }

  if (!permission) {
    return (
      <View style={overlay}>
        <Text style={heading}>Opening camera</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={overlay}>
        <Text style={heading}>Camera access is needed to shoot the cars.</Text>
        <BigButton label="Allow camera" onPress={() => void requestPermission()} />
        <BigButton label="Cancel" tone="dark" onPress={onClose} />
      </View>
    );
  }

  if (!choice) {
    return (
      <View style={overlay}>
        <Text style={heading}>Opening camera</Text>
      </View>
    );
  }

  const selectedLens = lensOverride ?? choice.selectedLens;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <WidestCamera
        ref={cameraRef}
        testID="camera-view"
        style={{ flex: 1 }}
        facing="back"
        mode="picture"
        zoom={choice.zoom}
        selectedLens={selectedLens}
        cameraId={choice.deviceId}
        useWidestZoom={choice.useWidestZoom}
        onAvailableLensesChanged={(event) => {
          const ultra = lensNames(event.lenses).find((lens) => /ultra/i.test(lens));
          if (ultra) setLensOverride(ultra);
        }}
      />
      <View style={banner}>
        <Text style={heading}>{angleLabel.toUpperCase()}</Text>
      </View>
      <View style={controls}>
        {error ? <Text style={errorText}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void shoot()}
          style={({ pressed }) => [shutter, { opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}
        >
          <Text style={shutterText}>{busy ? 'Saving photo' : `Take ${angleLabel} photo`}</Text>
        </Pressable>
        <BigButton label="Cancel" tone="dark" onPress={onClose} />
      </View>
    </View>
  );
}

const overlay = {
  flex: 1,
  backgroundColor: colors.bg,
  justifyContent: 'center' as const,
  padding: 20,
  gap: 16,
};

const banner = {
  position: 'absolute' as const,
  top: 24,
  left: 16,
  right: 16,
  backgroundColor: colors.bg,
  borderRadius: 12,
  padding: 12,
};

const heading = {
  color: colors.text,
  fontSize: 36,
  fontWeight: '800' as const,
  textAlign: 'center' as const,
};

const controls = {
  position: 'absolute' as const,
  left: 16,
  right: 16,
  bottom: 24,
  gap: 10,
};

const shutter = {
  minHeight: 88,
  borderRadius: 16,
  backgroundColor: colors.yellow,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  paddingHorizontal: 16,
};

const shutterText = {
  color: colors.ink,
  fontSize: 30,
  fontWeight: '800' as const,
};

const errorText = {
  color: colors.danger,
  fontSize: 22,
  fontWeight: '800' as const,
  textAlign: 'center' as const,
};
