// Rappels : notifications locales programmées sur le téléphone (aucun serveur).
// Stratégie simple et robuste : à chaque changement du calendrier, on efface tout
// et on reprogramme les rappels des 30 prochains jours.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { CalendarEvent } from './model';
import { planReminders } from './reminders';

const CHANNEL = 'rappels';

export const notificationsSupported = Platform.OS !== 'web';

let ready: Promise<boolean> | null = null;

/** Prépare le canal Android et demande l'autorisation (une seule fois). */
export function ensureNotifications(): Promise<boolean> {
  if (!notificationsSupported) return Promise.resolve(false);
  if (!ready) {
    ready = (async () => {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        // Sur Android 13+, la demande d'autorisation n'apparaît qu'une fois un canal créé.
        await Notifications.setNotificationChannelAsync(CHANNEL, {
          name: 'Rappels du calendrier',
          importance: Notifications.AndroidImportance.HIGH,
        });
        const current = await Notifications.getPermissionsAsync();
        if (current.status === 'granted') return true;
        const asked = await Notifications.requestPermissionsAsync();
        return asked.status === 'granted';
      } catch {
        return false;
      }
    })();
  }
  return ready;
}

/** Efface et reprogramme tous les rappels. Sans effet sur le web. */
export async function syncReminders(events: CalendarEvent[]): Promise<void> {
  if (!notificationsSupported) return;
  const plan = planReminders(events);
  const wantsAny = events.some((e) => (e.reminders?.length ?? 0) > 0 || e.itemEveReminder);
  if (wantsAny && !(await ensureNotifications())) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const p of plan) {
      await Notifications.scheduleNotificationAsync({
        content: { title: p.title, body: p.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL },
      });
    }
  } catch {
    // Un échec de programmation ne doit jamais bloquer l'appli.
  }
}
