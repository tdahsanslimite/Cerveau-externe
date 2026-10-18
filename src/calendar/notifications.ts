// Rappels : notifications locales programmées sur le téléphone (aucun serveur).
// Stratégie simple et robuste : à chaque changement du calendrier (et au démarrage), on efface tout
// et on reprogramme les rappels des 30 prochains jours.
//
// Sur Android, le son et la vibration appartiennent à un « canal » (réglé une fois pour toutes) :
// on crée donc un canal par type d'alerte, et chaque rappel est envoyé sur le canal choisi.
import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { AlertKind, CalendarEvent } from './model';
import { planReminders } from './reminders';

export const notificationsSupported = Platform.OS !== 'web';

const VIBRATION = [0, 400, 200, 400];

const CHANNELS: Record<AlertKind, Notifications.NotificationChannelInput & { id: string }> = {
  sonnerie: { id: 'rappel-sonnerie', name: 'Rappels : sonnerie', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: VIBRATION, enableVibrate: true },
  carillon: { id: 'rappel-carillon', name: 'Rappels : carillon', importance: Notifications.AndroidImportance.HIGH, sound: 'carillon.wav', vibrationPattern: VIBRATION, enableVibrate: true },
  cloche: { id: 'rappel-cloche', name: 'Rappels : cloche', importance: Notifications.AndroidImportance.HIGH, sound: 'cloche.wav', vibrationPattern: VIBRATION, enableVibrate: true },
  vibreur: { id: 'rappel-vibreur', name: 'Rappels : vibreur seul', importance: Notifications.AndroidImportance.HIGH, sound: null, vibrationPattern: VIBRATION, enableVibrate: true },
  silencieux: { id: 'rappel-silencieux', name: 'Rappels : silencieux', importance: Notifications.AndroidImportance.DEFAULT, sound: null, enableVibrate: false },
};

export const channelIdFor = (alert: AlertKind) => CHANNELS[alert].id;

/** Rappel récurrent de l'onglet Idées : la synchro du calendrier ne doit jamais l'effacer. */
export const IDEAS_REMINDER_ID = 'idees-rappel';

/** Dernier problème rencontré, affiché dans Réglages › Rappels pour comprendre ce qui bloque. */
let lastError: string | null = null;

// Affiche aussi les rappels quand l'appli est ouverte.
if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let channelsReady: Promise<void> | null = null;

function createChannels(): Promise<void> {
  if (!channelsReady) {
    channelsReady = (async () => {
      for (const { id, ...input } of Object.values(CHANNELS)) {
        await Notifications.setNotificationChannelAsync(id, input);
      }
      // Ancien canal unique de la v1.1 : retiré pour ne pas encombrer les réglages Android.
      await Notifications.deleteNotificationChannelAsync('rappels').catch(() => undefined);
    })().catch((e) => {
      channelsReady = null;
      lastError = `Canaux : ${String(e?.message ?? e)}`;
    });
  }
  return channelsReady;
}

/** Prépare les canaux et demande l'autorisation. Redemande à chaque appel tant que ce n'est pas accordé. */
export async function ensureNotifications(): Promise<boolean> {
  if (!notificationsSupported) return false;
  try {
    // Sur Android 13+, la demande d'autorisation n'apparaît qu'une fois un canal créé.
    await createChannels();
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    if (!current.canAskAgain) {
      lastError = 'Notifications refusées dans les réglages Android.';
      return false;
    }
    const asked = await Notifications.requestPermissionsAsync();
    if (asked.status !== 'granted') lastError = 'Autorisation des notifications refusée.';
    return asked.status === 'granted';
  } catch (e) {
    lastError = `Autorisation : ${String((e as Error)?.message ?? e)}`;
    return false;
  }
}

let syncing: Promise<void> = Promise.resolve();

/** Efface et reprogramme tous les rappels (les appels s'enchaînent, jamais en parallèle). */
export function syncReminders(events: CalendarEvent[], defaultAlert: AlertKind): Promise<void> {
  syncing = syncing.then(() => doSync(events, defaultAlert));
  return syncing;
}

async function doSync(events: CalendarEvent[], defaultAlert: AlertKind): Promise<void> {
  if (!notificationsSupported) return;
  const plan = planReminders(events, new Date(), undefined, defaultAlert);
  const wantsAny = events.some((e) => (e.reminders?.length ?? 0) > 0 || e.itemEveReminder);
  if (wantsAny && !(await ensureNotifications())) return;
  try {
    // On efface seulement les rappels du calendrier : celui des Idées (identifiant fixe) reste en place.
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier !== IDEAS_REMINDER_ID) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    for (const p of plan) {
      await Notifications.scheduleNotificationAsync({
        content: { title: p.title, body: p.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: channelIdFor(p.alert) },
      });
    }
    lastError = null;
  } catch (e) {
    lastError = `Programmation : ${String((e as Error)?.message ?? e)}`;
  }
}

export interface NotificationStatus {
  supported: boolean;
  permission: 'accordée' | 'refusée' | 'pas encore demandée';
  scheduled: number;
  next: Date | null;
  error: string | null;
}

export async function notificationStatus(): Promise<NotificationStatus> {
  if (!notificationsSupported) return { supported: false, permission: 'pas encore demandée', scheduled: 0, next: null, error: null };
  try {
    const perm = await Notifications.getPermissionsAsync();
    // Le rappel des Idées n'est pas un rappel du calendrier : on ne le compte pas ici.
    const all = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.identifier !== IDEAS_REMINDER_ID);
    const dates = all
      .map((n) => (n.trigger as { value?: number; date?: number } | null))
      .map((t) => (t?.value ?? t?.date ?? null))
      .filter((v): v is number => typeof v === 'number')
      .sort((a, b) => a - b);
    return {
      supported: true,
      permission: perm.status === 'granted' ? 'accordée' : perm.status === 'denied' ? 'refusée' : 'pas encore demandée',
      scheduled: all.length,
      next: dates.length ? new Date(dates[0]) : null,
      error: lastError,
    };
  } catch (e) {
    return { supported: true, permission: 'pas encore demandée', scheduled: 0, next: null, error: String((e as Error)?.message ?? e) };
  }
}

/** Envoie un rappel d'essai dans 10 secondes, avec le type d'alerte choisi. */
export async function sendTestNotification(alert: AlertKind): Promise<boolean> {
  if (!(await ensureNotifications())) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Rappel d’essai', body: 'Si tu lis ceci, les rappels fonctionnent.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: channelIdFor(alert) },
    });
    return true;
  } catch (e) {
    lastError = `Essai : ${String((e as Error)?.message ?? e)}`;
    return false;
  }
}

/** Ouvre la page de l'appli dans les réglages Android (pour réactiver les notifications). */
export function openAppSettings() {
  Linking.openSettings().catch(() => undefined);
}
