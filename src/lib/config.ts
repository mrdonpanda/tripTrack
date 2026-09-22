import Constants from 'expo-constants';

type Extra = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  shareBaseUrl?: string;
};

export function appExtra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

export function shareUrl(token: string): string {
  const configured = (appExtra().shareBaseUrl || '').replace(/\/$/, '');
  if (configured) return `${configured}/s/${token}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/s/${token}`;
  }
  return `/s/${token}`;
}

export function photoPublicUrl(storagePath: string): string {
  const base = (appExtra().supabaseUrl || '').replace(/\/$/, '');
  const encoded = storagePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${base}/storage/v1/object/public/trip-photos/${encoded}`;
}
