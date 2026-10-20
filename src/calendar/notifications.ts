// Rappels : notifications locales programmées sur le téléphone (aucun serveur).
// Stratégie simple et robuste : à chaque changement du calendrier (et au démarrage), on efface tout
// et on reprogramme les rappels des 30 prochains jours.
//
// Sur Android, le son et la vibration appartiennent à un « canal » (réglé une fois pour toutes) :
// on crée donc un canal par type d'alerte, et chaque rappel est envoyé sur le canal choisi.
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { AlertKind, CalendarEvent } from './model';
import { planReminders, splitByAlarm } from './reminders';
import { alarmsSupported, scheduleAlarms, scheduledAlarmTimes, sendTestAlarm } from './alarm';

export const notificationsSupported = Platform.OS !== 'web';

const VIBRATION = [0, 400, 200, 400];

const CHANNELS: Record<Exclude<AlertKind, 'alarme'>, Notifications.NotificationChannelInput & { id: string }> = {
  sonnerie: { id: 'rappel-sonnerie', name: 'Rappels : sonnerie', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: VIBRATION, enableVibrate: true },
  carillon: { id: 'rappel-carillon', name: 'Rappels : carillon', importance: Notifications.AndroidImportance.HIGH, sound: 'carillon.wav', vibrationPattern: VIBRATION, enableVibrate: true },
  cloche: { id: 'rappel-cloche', name: 'Rappels : cloche', importance: Notifications.AndroidImportance.HIGH, sound: 'cloche.wav', vibrationPattern: VIBRATION, enableVibrate: true },
  vibreur: { id: 'rappel-vibreur', name: 'Rappels : vibreur seul', importance: Notifications.AndroidImportance.HIGH, sound: null, vibrationPattern: VIBRATION, enableVibrate: true },
  silencieux: { id: 'rappel-silencieux', name: 'Rappels : silencieux', importance: Notifications.AndroidImportance.DEFAULT, sound: null, enableVibrate: false },
};

/** Canal d'un type d'alerte. L'« alarme » (son en boucle) est gérée à part, dans alarm.ts : ici elle retombe sur la sonnerie. */
export const channelIdFor = (alert: AlertKind) => CHANNELS[alert === 'alarme' ? 'sonnerie' : alert].id;

/** Rappel récurrent de l'onglet Idées : la synchro du calendrier ne doit jamais l'effacer. */
export const IDEAS_REMINDER_ID = 'idees-rappel';

/**
 * Problèmes rencontrés, affichés dans Réglages › Rappels pour comprendre ce qui bloque.
 * Gardés (5 derniers, avec l'heure) et sauvegardés : une synchro réussie ne les efface plus,
 * sinon le message disparaît avant qu'on ait eu le temps de le lire.
 */
export interface NotifProblem { at: number; msg: string }
const PROBLEMS_KEY = 'ce.notif-problems.v1';
let problems: NotifProblem[] = [];
const problemsLoaded = AsyncStorage.getItem(PROBLEMS_KEY)
  .then((raw) => { if (raw) problems = [...JSON.parse(raw), ...problems].slice(-5); })
  .catch(() => undefined);

function recordError(msg: string) {
  problems = [...problems, { at: Date.now(), msg }].slice(-5);
  AsyncStorage.setItem(PROBLEMS_KEY, JSON.stringify(problems)).catch(() => undefined);
}

export async function clearProblems(): Promise<void> {
  problems = [];
  await AsyncStorage.removeItem(PROBLEMS_KEY).catch(() => undefined);
}

const errText = (e: unknown) => String((e as Error)?.message ?? e);

type Trigger = Notifications.NotificationTriggerInput;

/**
 * Programme une notification sur son canal. Si Android refuse (canal absent, etc.),
 * on note le problème et on réessaie sur le canal par défaut : mieux vaut un rappel
 * avec le son standard qu'aucun rappel.
 */
async function scheduleSafe(content: Notifications.NotificationContentInput, trigger: Trigger, label: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({ content, trigger });
  } catch (e) {
    recordError(`${label} (canal ${(trigger as { channelId?: string })?.channelId ?? '?'}) : ${errText(e)}`);
    const { channelId: _drop, ...plain } = (trigger ?? {}) as Record<string, unknown>;
    await Notifications.scheduleNotificationAsync({ content: { ...content, sound: true }, trigger: plain as Trigger });
  }
}

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
      // Un canal à la fois : si l'un échoue (un son introuvable…), les autres sont quand même créés.
      for (const { id, ...input } of Object.values(CHANNELS)) {
        try {
          await Notifications.setNotificationChannelAsync(id, input);
          if (!(await Notifications.getNotificationChannelAsync(id))) recordError(`Canal ${id} : pas créé par Android.`);
        } catch (e) {
          recordError(`Canal ${id} : ${errText(e)}`);
        }
      }
      // Ancien canal unique de la v1.1 : retiré pour ne pas encombrer les réglages Android.
      await Notifications.deleteNotificationChannelAsync('rappels').catch(() => undefined);
    })();
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
      recordError('Notifications refusées dans les réglages Android.');
      return false;
    }
    const asked = await Notifications.requestPermissionsAsync();
    if (asked.status !== 'granted') recordError('Autorisation des notifications refusée.');
    return asked.status === 'granted';
  } catch (e) {
    recordError(`Autorisation : ${errText(e)}`);
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
  const { alarms, others: plan } = splitByAlarm(planReminders(events, new Date(), undefined, defaultAlert));
  const wantsAny = events.some((e) => (e.reminders?.length ?? 0) > 0 || e.itemEveReminder);
  if (wantsAny && !(await ensureNotifications())) return;
  try {
    // On efface seulement les rappels du calendrier : celui des Idées (identifiant fixe) reste en place.
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier !== IDEAS_REMINDER_ID) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    let failed = 0;
    for (const p of plan) {
      try {
        await scheduleSafe(
          { title: p.title, body: p.body },
          { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: channelIdFor(p.alert) },
          `Rappel « ${p.title} »`,
        );
      } catch (e) {
        if (++failed === 1) recordError(`Programmation : ${errText(e)}`);
      }
    }
    // Les alarmes (son en boucle) sont reprogrammées à part ; sans alarme, on efface celles d'avant.
    await scheduleAlarms(alarms);
  } catch (e) {
    recordError(`Programmation : ${errText(e)}`);
  }
}

export interface NotificationStatus {
  supported: boolean;
  permission: 'accordée' | 'refusée' | 'pas encore demandée';
  scheduled: number;
  next: Date | null;
  problems: NotifProblem[];
}

export async function notificationStatus(): Promise<NotificationStatus> {
  if (!notificationsSupported) return { supported: false, permission: 'pas encore demandée', scheduled: 0, next: null, problems: [] };
  await problemsLoaded;
  try {
    const perm = await Notifications.getPermissionsAsync();
    // Le rappel des Idées n'est pas un rappel du calendrier : on ne le compte pas ici.
    const all = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.identifier !== IDEAS_REMINDER_ID);
    const alarmTimes = await scheduledAlarmTimes();
    const dates = all
      .map((n) => (n.trigger as { value?: number; date?: number } | null))
      .map((t) => (t?.value ?? t?.date ?? null))
      .filter((v): v is number => typeof v === 'number')
      .concat(alarmTimes)
      .sort((a, b) => a - b);
    return {
      supported: true,
      permission: perm.status === 'granted' ? 'accordée' : perm.status === 'denied' ? 'refusée' : 'pas encore demandée',
      scheduled: all.length + alarmTimes.length,
      next: dates.length ? new Date(dates[0]) : null,
      problems,
    };
  } catch (e) {
    recordError(`État : ${errText(e)}`);
    return { supported: true, permission: 'pas encore demandée', scheduled: 0, next: null, problems };
  }
}

/** Envoie un rappel d'essai dans 10 secondes, avec le type d'alerte choisi. */
export async function sendTestNotification(alert: AlertKind): Promise<boolean> {
  if (!(await ensureNotifications())) return false;
  try {
    if (alert === 'alarme') {
      if (!alarmsSupported) return false;
      const ok = await sendTestAlarm();
      if (!ok) recordError('Essai : l’alarme n’a pas pu être programmée.');
      return ok;
    }
    await scheduleSafe(
      { title: 'Rappel d’essai', body: 'Si tu lis ceci, les rappels fonctionnent.' },
      { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: channelIdFor(alert) },
      'Essai',
    );
    return true;
  } catch (e) {
    recordError(`Essai : ${errText(e)}`);
    return false;
  }
}

/** Ouvre la page de l'appli dans les réglages Android (pour réactiver les notifications). */
export function openAppSettings() {
  Linking.openSettings().catch(() => undefined);
}
