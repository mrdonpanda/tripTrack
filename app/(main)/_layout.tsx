import { Redirect, Stack } from 'expo-router';

import { AppQueueProvider } from '../../src/lib/appQueue';
import { useAuth } from '../../src/lib/auth';
import { colors } from '../../src/theme';
import { BigButton, Loading } from '../../src/components/ui';
import { Text, View } from 'react-native';

export default function MainLayout() {
  const { session, ready, seeded, seedError, retrySeed } = useAuth();
  if (!ready) return <Loading label="Loading" />;
  if (!session) return <Redirect href="/sign-in" />;
  if (seedError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 20, gap: 16 }}>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800' }}>Could not set up cities</Text>
        <Text style={{ color: colors.danger, fontSize: 22, fontWeight: '800' }}>{seedError}</Text>
        <BigButton label="Try again" onPress={retrySeed} />
      </View>
    );
  }
  if (!seeded) return <Loading label="Setting up cities" />;
  return (
    <AppQueueProvider userId={session.user.id}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </AppQueueProvider>
  );
}
