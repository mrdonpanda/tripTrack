import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { type ReactNode } from 'react';
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

export function Screen({
  children,
  footer,
  scroll = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  return (
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
  );
}

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
