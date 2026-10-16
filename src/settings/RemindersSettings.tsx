// Réglages › Rappels : type d'alerte par défaut, essai, et ce qui bloque si rien ne sonne.
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { minutesToLabel, relativeLabel, toKey, labelDayShort } from '../calendar/dates';
import { ALERTS } from '../calendar/model';
import {
  notificationsSupported, notificationStatus, NotificationStatus, openAppSettings, sendTestNotification,
} from '../calendar/notifications';
import { colors, radius } from '../theme';
import { Button, Chip, Txt } from '../ui';
import { useSettings } from './SettingsContext';

function when(d: Date): string {
  const key = toKey(d);
  return `${relativeLabel(key) ?? labelDayShort(key)} à ${minutesToLabel(d.getHours() * 60 + d.getMinutes())}`;
}

export function RemindersSettings() {
  const { settings, update } = useSettings();
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void notificationStatus().then(setStatus);
  }, []);
  useEffect(refresh, [refresh]);

  const test = async () => {
    setTestMsg('Envoi…');
    const ok = await sendTestNotification(settings.defaultAlert);
    setTestMsg(ok ? 'Rappel d’essai dans 10 secondes. Tu peux verrouiller le téléphone.' : 'Impossible d’envoyer le rappel : voir ci-dessous.');
    refresh();
  };

  return (
    <View style={st.group}>
      <View style={st.block}>
        <Txt bold>Type d'alerte par défaut</Txt>
        <View style={st.wrap}>
          {ALERTS.map((a) => (
            <Chip key={a.id} label={a.label} selected={settings.defaultAlert === a.id} onPress={() => update({ defaultAlert: a.id })} />
          ))}
        </View>
        <Txt size={13} color={colors.muted} style={{ lineHeight: 19 }}>
          Chaque événement peut avoir le sien. Sonnerie = le son de notification de ton téléphone.
        </Txt>
      </View>

      {notificationsSupported ? (
        <View style={[st.block, { borderBottomWidth: 0 }]}>
          <Button label="Tester un rappel" kind="ghost" icon="bell" onPress={test} />
          {testMsg ? <Txt size={14} color={colors.accentDark}>{testMsg}</Txt> : null}
          {status ? (
            <View style={{ gap: 4 }}>
              <Txt size={14}>
                Autorisation : <Txt bold size={14} color={status.permission === 'accordée' ? colors.ok : colors.danger}>{status.permission}</Txt>
              </Txt>
              <Txt size={14}>
                Rappels programmés : <Txt bold size={14}>{status.scheduled}</Txt>
                {status.next ? ` · prochain ${when(status.next)}` : ''}
              </Txt>
              {status.error ? <Txt size={14} color={colors.danger}>Problème : {status.error}</Txt> : null}
            </View>
          ) : null}
          {status && status.permission !== 'accordée' ? (
            <Button label="Autoriser dans les réglages Android" kind="dark" onPress={openAppSettings} />
          ) : null}
        </View>
      ) : (
        <View style={[st.block, { borderBottomWidth: 0 }]}>
          <Txt size={14} color={colors.muted}>Les rappels sonnent uniquement dans l'appli installée sur le téléphone.</Txt>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  group: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  block: { padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
