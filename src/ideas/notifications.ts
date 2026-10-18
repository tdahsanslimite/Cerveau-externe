// Rappel de tri des idées : une notification locale qui revient seule, chaque jour ou chaque semaine.
// Elle a un identifiant fixe pour ne jamais être confondue avec les rappels du calendrier
// (la synchro du calendrier la laisse en place, voir calendar/notifications.ts).
import * as Notifications from 'expo-notifications';
import type { AlertKind } from '../calendar/model';
import { channelIdFor, ensureNotifications, IDEAS_REMINDER_ID, notificationsSupported } from '../calendar/notifications';
import { IdeasReminder, reminderTrigger } from './model';

let syncing: Promise<unknown> = Promise.resolve();

/**
 * Remplace le rappel actuel par celui qui est demandé (ou le supprime si le rappel est désactivé).
 * Les appels s'enchaînent, jamais en parallèle. Renvoie false si le téléphone refuse les notifications.
 */
export function syncIdeasReminder(reminder: IdeasReminder, alert: AlertKind): Promise<boolean> {
  const run = syncing.then(() => doSync(reminder, alert));
  syncing = run.catch(() => undefined);
  return run;
}

async function doSync(reminder: IdeasReminder, alert: AlertKind): Promise<boolean> {
  if (!notificationsSupported) return false;
  try {
    await Notifications.cancelScheduledNotificationAsync(IDEAS_REMINDER_ID);
    const trigger = reminderTrigger(reminder);
    if (!trigger) return true;
    if (!(await ensureNotifications())) return false;
    const channelId = channelIdFor(alert);
    await Notifications.scheduleNotificationAsync({
      identifier: IDEAS_REMINDER_ID,
      content: { title: 'Tes idées t’attendent', body: 'Vide ou trie ta liste : ça libère ta tête.' },
      trigger:
        trigger.kind === 'daily'
          ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: trigger.hour, minute: trigger.minute, channelId }
          : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: trigger.weekday, hour: trigger.hour, minute: trigger.minute, channelId },
    });
    return true;
  } catch {
    return false;
  }
}
