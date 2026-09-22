import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#000000',
  text: '#FFFFFF',
  muted: '#E6E6E6',
  yellow: '#FFE14A',
  ink: '#000000',
  card: '#111111',
  danger: '#FF3B30',
  ok: '#D6FF4A',
  input: '#FFFFFF',
};

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
  },
  body: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  muted: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 22,
    fontWeight: '800',
  },
  label: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.input,
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    minHeight: 72,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 3,
    borderColor: colors.text,
  },
  button: {
    minHeight: 76,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    borderWidth: 3,
  },
  buttonText: {
    fontSize: 28,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.text,
    borderWidth: 3,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
});
