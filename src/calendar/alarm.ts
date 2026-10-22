// Alarme : un rappel qui sonne EN BOUCLE jusqu'à ce qu'on touche « Je m'en occupe », comme un réveil.
// expo-notifications ne sait jouer le son qu'une fois : ce niveau passe donc par react-native-notify-kit
// (successeur entretenu de Notifee). Les autres rappels restent sur expo-notifications.
//
// Une alarme = une notification programmée à l'heure exacte (alarme système « réveil », qui passe la
// veille profonde), « en cours » (ne se balaie pas du doigt), son en boucle, plein écran si Android l'autorise.
// Pas de bouton « Reporter » (décision de Valentin) : la seule sortie est de s'en occuper.
import { Platform } from 'react-native';
import type { Notification } from 'react-native-notify-kit';
import type { Planned } from './reminders';
import { ALARM_PHRASES, pickPhrase } from './phrases';
import { ALARM_VIBRATION } from './alarmConfig';

export const ALARM_CHANNEL_ID = 'rappel-alarme';
const ALARM_KIND = 'alarme';
const STOP_ACTION_ID = 'stop';
export const alarmsSupported = Platform.OS === 'android';

// Chargement à la demande : le module natif n'existe que sur Android (jamais touché sur le web).
type Kit = typeof import('react-native-notify-kit');
function kit(): Kit {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-notify-kit') as Kit;
}

async function ensureChannel(): Promise<void> {
  const { default: notifee, AndroidImportance, AndroidVisibility } = kit();
  await notifee.createChannel({
    id: ALARM_CHANNEL_ID,
    name: 'Alarmes de rappel',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: ALARM_VIBRATION,
    bypassDnd: true,
    visibility: AndroidVisibility.PUBLIC,
  });
}

function alarmNotification(id: string, title: string, body: string, phrase: string): Notification {
  const { AndroidCategory, AndroidImportance, AndroidStyle, AndroidVisibility } = kit();
  const text = phrase ? `${body}\n\n${phrase}` : body;
  return {
    id,
    title,
    body: text,
    data: { kind: ALARM_KIND },
    android: {
      channelId: ALARM_CHANNEL_ID,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      style: { type: AndroidStyle.BIGTEXT, text },
      ongoing: true, // ne se balaie pas : il faut la traiter
      autoCancel: false,
      loopSound: true, // le son recommence jusqu'à ce que la notification disparaisse
      pressAction: { id: 'default' },
      fullScreenAction: { id: 'plein-ecran' },
      actions: [{ title: 'Je m’en occupe', pressAction: { id: STOP_ACTION_ID } }],
    },
  };
}

/** Remplace toutes les alarmes programmées par celles demandées (liste vide = les efface toutes). */
export async function scheduleAlarms(items: Planned[]): Promise<void> {
  if (!alarmsSupported) return;
  const { default: notifee, TriggerType, AlarmType } = kit();
  await stopLaunchedAlarm();
  await notifee.cancelTriggerNotifications();
  if (items.length === 0) return;
  await ensureChannel();
  let previous: string | undefined;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const phrase = pickPhrase(ALARM_PHRASES, Math.random, previous);
    previous = phrase;
    await notifee.createTriggerNotification(
      alarmNotification(`alarme-${it.at.getTime()}-${i}`, it.title, it.body, phrase),
      { type: TriggerType.TIMESTAMP, timestamp: it.at.getTime(), alarmManager: { type: AlarmType.SET_ALARM_CLOCK } },
    );
  }
}

/** Alarme d'essai dans 10 secondes (Réglages › Rappels). */
export async function sendTestAlarm(): Promise<boolean> {
  if (!alarmsSupported) return false;
  try {
    const { default: notifee, TriggerType, AlarmType } = kit();
    await ensureChannel();
    await notifee.createTriggerNotification(
      alarmNotification('alarme-essai', 'Alarme d’essai', 'Elle sonne jusqu’à ce que tu touches « Je m’en occupe ».', pickPhrase()),
      { type: TriggerType.TIMESTAMP, timestamp: Date.now() + 10000, alarmManager: { type: AlarmType.SET_ALARM_CLOCK } },
    );
    return true;
  } catch {
    return false;
  }
}

/** Heures des alarmes programmées (pour l'état affiché dans les réglages). */
export async function scheduledAlarmTimes(): Promise<number[]> {
  if (!alarmsSupported) return [];
  try {
    const { default: notifee } = kit();
    const all = await notifee.getTriggerNotifications();
    return all
      .filter((t) => t.notification.id !== 'alarme-essai')
      .map((t) => (t.trigger as { timestamp?: number }).timestamp)
      .filter((v): v is number => typeof v === 'number');
  } catch {
    return [];
  }
}

type AlarmEvent = { type: number; detail: { notification?: { id?: string; data?: Record<string, unknown> } } };

async function onAlarmEvent(event: AlarmEvent): Promise<void> {
  const { default: notifee, EventType } = kit();
  const n = event.detail.notification;
  if (!n?.id || n.data?.kind !== ALARM_KIND) return;
  // Toucher la notification ou « Je m'en occupe » = éteindre (le son s'arrête avec la notification).
  if (event.type === EventType.PRESS || event.type === EventType.ACTION_PRESS || event.type === EventType.DISMISSED) {
    await notifee.cancelNotification(n.id);
  }
}

/** Si l'appli vient d'être ouverte en touchant une alarme (appli fermée), on l'éteint. */
async function stopLaunchedAlarm(): Promise<void> {
  try {
    const { default: notifee } = kit();
    const initial = await notifee.getInitialNotification();
    const pressId = initial?.pressAction?.id;
    const n = initial?.notification;
    if (n?.id && n.data?.kind === ALARM_KIND && (pressId === 'default' || pressId === STOP_ACTION_ID)) {
      await notifee.cancelNotification(n.id);
    }
  } catch {
    // sans effet : l'alarme restera affichée, on peut l'éteindre depuis la notification
  }
}

/** À appeler une seule fois, au tout début (index.ts) : écoute les touches sur les alarmes, appli ouverte ou non. */
export function registerAlarmEvents(): void {
  if (!alarmsSupported) return;
  const { default: notifee } = kit();
  notifee.onBackgroundEvent(onAlarmEvent as never);
  notifee.onForegroundEvent(onAlarmEvent as never);
}
