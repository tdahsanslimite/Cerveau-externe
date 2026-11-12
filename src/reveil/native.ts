// Pont vers le module Android « Reveil » (modules/reveil). Absent sur le web : tout devient sans effet.
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { NativeSpec } from './model';

export type ReveilStatus = { exact: boolean; notifications: boolean; fullScreen: boolean; ringing: boolean };

type ReveilNative = {
  setAlarms(json: string): Promise<boolean>;
  consumeFired(): Promise<string[]>;
  status(): Promise<ReveilStatus>;
  stopRinging(): Promise<boolean>;
  openSettings(kind: 'exact' | 'fullScreen' | 'notifications' | 'app'): Promise<boolean>;
  pickRingtone(current: string | null): Promise<{ uri: string; title: string } | null>;
  preview(sound: string): Promise<boolean>;
  stopPreview(): Promise<boolean>;
};

const mod: ReveilNative | null = Platform.OS === 'android' ? requireOptionalNativeModule<ReveilNative>('Reveil') : null;

/** Le téléphone sait-il faire sonner les réveils ? (faux sur le web et dans une ancienne version de l'appli) */
export const reveilAvailable = mod !== null;

export async function syncAlarms(specs: NativeSpec[]): Promise<void> {
  if (!mod) return;
  await mod.setAlarms(JSON.stringify(specs));
}

export async function consumeFired(): Promise<string[]> {
  if (!mod) return [];
  try {
    return await mod.consumeFired();
  } catch {
    return [];
  }
}

export async function reveilStatus(): Promise<ReveilStatus | null> {
  if (!mod) return null;
  try {
    return await mod.status();
  } catch {
    return null;
  }
}

export async function openReveilSettings(kind: 'exact' | 'fullScreen' | 'notifications' | 'app'): Promise<void> {
  await mod?.openSettings(kind).catch(() => undefined);
}

export async function stopRinging(): Promise<void> {
  await mod?.stopRinging().catch(() => undefined);
}

/** Ouvre le choix des sonneries d'Android. `current` = adresse de la sonnerie déjà choisie. */
export async function pickPhoneRingtone(current: string | null): Promise<{ uri: string; title: string } | null> {
  if (!mod) return null;
  try {
    return await mod.pickRingtone(current);
  } catch {
    return null;
  }
}

export async function previewSound(sound: string): Promise<void> {
  await mod?.preview(sound).catch(() => undefined);
}

export async function stopPreview(): Promise<void> {
  await mod?.stopPreview().catch(() => undefined);
}
