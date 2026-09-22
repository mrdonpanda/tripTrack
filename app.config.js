const fs = require('fs');
const path = require('path');

function publicEnv(name) {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  try {
    const text = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1 || trimmed.slice(0, eq) !== name) continue;
      return trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  } catch {
    return '';
  }
  return '';
}

const config = {
  name: 'Trip Tracker',
  slug: 'trip-tracker',
  scheme: 'triptracker',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#000000',
  plugins: [
    'expo-router',
    'expo-status-bar',
    '@react-native-community/datetimepicker',
    [
      'expo-camera',
      {
        cameraPermission: 'Trip Tracker uses the camera to photograph cars on the lot.',
        recordAudioAndroid: false,
        barcodeScannerEnabled: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  android: {
    package: 'boo.orale.triptracker',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFE14A',
    },
    permissions: ['android.permission.CAMERA'],
  },
  ios: {
    bundleIdentifier: 'boo.orale.triptracker',
    infoPlist: {
      NSCameraUsageDescription: 'Trip Tracker uses the camera to photograph cars on the lot.',
    },
  },
  web: {
    bundler: 'metro',
  },
  extra: {
    supabaseUrl: publicEnv('SUPABASE_URL'),
    supabasePublishableKey: publicEnv('SUPABASE_PUBLISHABLE_KEY'),
    shareBaseUrl: publicEnv('EXPO_PUBLIC_SHARE_BASE_URL'),
    eas: {
        projectId: "86693285-e54b-4b37-b479-d839f1cdc760",
    },
  },
};

module.exports = config;
