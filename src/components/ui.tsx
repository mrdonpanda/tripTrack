import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, styles } from '../theme';

type OverlayApi = {
  show: (node: ReactNode) => void;
  hide: () => void;
};

const OverlayContext = createContext<OverlayApi | null>(null);

export function useScreenOverlay(): OverlayApi | null {
  return useContext(OverlayContext);
}

export function Screen({
  children,
  footer,
  scroll = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const [overlay, setOverlay] = useState<ReactNode>(null);
  const api = useMemo<OverlayApi>(
    () => ({
      show: (node) => setOverlay(node),
      hide: () => setOverlay(null),
    }),
    [],
  );
  return (
    <OverlayContext.Provider value={api}>
      <View style={styles.flex}>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {scroll ? (
              <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.flex, { padding: 16, gap: 14 }]}>{children}</View>
            )}
            {footer ? <View style={{ padding: 16, paddingTop: 0, gap: 10 }}>{footer}</View> : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
        {overlay ? (
          <View pointerEvents="auto" style={cameraOverlay}>
            {overlay}
          </View>
        ) : null}
      </View>
    </OverlayContext.Provider>
  );
}

const cameraOverlay = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: 30,
  elevation: 30,
  backgroundColor: colors.bg,
};

export function BigButton({
  label,
  onPress,
  tone = 'yellow',
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'yellow' | 'dark' | 'danger';
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const background = tone === 'yellow' ? colors.yellow : tone === 'danger' ? colors.danger : colors.bg;
  const border = tone === 'dark' ? colors.text : background;
  const textColor = tone === 'yellow' ? colors.ink : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: border, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}
    >
      {icon}
      <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function BigField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry = false,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#666666"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

export function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.back()}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 64 }]}
    >
      <ChevronLeft color={colors.text} size={42} />
      <Text style={styles.body}>{label}</Text>
    </Pressable>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <SafeAreaView style={[styles.safe, { justifyContent: 'center', padding: 24 }]}>
      <Text style={styles.title}>{label}</Text>
    </SafeAreaView>
  );
}
