import { CameraView, type CameraViewProps } from 'expo-camera';
import { useEffect, useRef, useState, type ComponentType, type Ref } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { ensureCameraAccess } from '../lib/cameraAccess';
import { selectWidestBackCamera, type WidestCameraChoice } from '../lib/cameraDevices';
import { queryCameraDevices } from '../lib/cameraQuery';
import { startVolumeShutter } from '../lib/volumeShutter';
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
  const { width, height } = useWindowDimensions();
  const frame = { flex: 1 as const, width, height, backgroundColor: colors.bg };
  const cameraRef = useRef<CameraView>(null);
  const [access, setAccess] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [choice, setChoice] = useState<WidestCameraChoice | null>(null);
  const [forceDefault, setForceDefault] = useState(false);
  const [lensOverride, setLensOverride] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shootRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    let live = true;
    ensureCameraAccess()
      .then((ok) => {
        if (live) setAccess(ok ? 'granted' : 'denied');
      })
      .catch(() => {
        if (live) setAccess('denied');
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (access !== 'granted') return;
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
  }, [access]);

  async function askAgain() {
    setAccess('pending');
    setError(null);
    try {
      const ok = await ensureCameraAccess();
      setAccess(ok ? 'granted' : 'denied');
    } catch {
      setAccess('denied');
    }
  }

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

  const showCamera = access === 'granted' && choice != null;
  const selectedLens = lensOverride ?? choice?.selectedLens;
  shootRef.current = () => {
    void shoot();
  };

  useEffect(() => {
    if (!showCamera) return;
    let live = true;
    let shutter: { stop: () => void } | null = null;
    startVolumeShutter(() => {
      shootRef.current();
    })
      .then((started) => {
        if (!live) started.stop();
        else shutter = started;
      })
      .catch(() => undefined);
    return () => {
      live = false;
      shutter?.stop();
    };
  }, [showCamera]);

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}
    >
      <View testID="camera-frame" collapsable={false} style={frame}>
        {showCamera ? (
          <WidestCamera
            key={forceDefault ? 'default-back' : 'widest-back'}
            ref={cameraRef}
            testID="camera-view"
            collapsable={false}
            style={frame}
            facing="back"
            mode="picture"
            zoom={choice.zoom}
            selectedLens={selectedLens}
            cameraId={forceDefault ? undefined : choice.deviceId}
            useWidestZoom={choice.useWidestZoom}
            onMountError={(event) => {
              if (!forceDefault && choice.deviceId) {
                setForceDefault(true);
                setError(null);
                return;
              }
              setError(event.message || 'The camera preview did not start');
            }}
            onAvailableLensesChanged={(event) => {
              const ultra = lensNames(event.lenses).find((lens) => /ultra/i.test(lens));
              if (ultra) setLensOverride(ultra);
            }}
          />
        ) : (
          <View style={[frame, { justifyContent: 'center', padding: 20, gap: 16 }]}>
            {access === 'denied' ? (
              <>
                <Text style={heading}>Camera access is needed to shoot the cars.</Text>
                <BigButton label="Allow camera" onPress={() => void askAgain()} />
                <BigButton label="Cancel" tone="dark" onPress={onClose} />
              </>
            ) : (
              <Text style={heading}>Opening camera</Text>
            )}
          </View>
        )}
        {showCamera ? (
          <>
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
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const banner = {
  position: 'absolute' as const,
  top: 36,
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
  bottom: 48,
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
