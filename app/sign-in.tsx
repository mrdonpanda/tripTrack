import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { BigButton, BigField, Loading, Screen } from '../src/components/ui';
import { useAuth } from '../src/lib/auth';
import { supabase, supabaseConfigured } from '../src/lib/supabase';
import { styles } from '../src/theme';

export default function SignInScreen() {
  const { session, ready } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ready) return <Loading label="Loading" />;
  if (session) return <Redirect href="/" />;

  async function signIn() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signInError) setError(signInError.message);
  }

  async function createAccount() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setNotice('Check your email to confirm the account, then sign in.');
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Trip Tracker</Text>
      <Text style={styles.body}>Sign in to log loads, photos, and weekly pay.</Text>
      {!supabaseConfigured() ? (
        <Text style={styles.error}>Supabase URL and publishable key are missing from the app config.</Text>
      ) : null}
      <BigField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <BigField
        label="Password"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        secureTextEntry
        placeholder="Password"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.body}>{notice}</Text> : null}
      <BigButton label={busy ? 'Working' : 'Sign in'} onPress={() => void signIn()} disabled={busy} />
      <BigButton
        label="Create account"
        tone="dark"
        onPress={() => void createAccount()}
        disabled={busy}
      />
    </Screen>
  );
}
