// Réglages › Agendas du téléphone : activer la lecture de Google Agenda (et des agendas synchronisés), choisir lesquels.
import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { colors, radius } from '../theme';
import { Button, Icon, Txt } from '../ui';
import { openAppSettings } from '../calendar/notifications';

export function PhoneCalendarsSettings() {
  const { phone } = useCalendar();
  const on = phone.status === 'on' || phone.status === 'loading';
  return (
    <View style={st.group}>
      <View style={st.row}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt bold>Afficher mes agendas du téléphone</Txt>
          <Txt size={13} color={colors.muted} style={{ lineHeight: 18 }}>
            Google Agenda (rendez-vous Calendly compris) et tout agenda synchronisé sur ce téléphone. Lecture seule : rien n'est modifié chez Google.
          </Txt>
        </View>
        <Switch
          accessibilityLabel="Afficher mes agendas du téléphone"
          value={on}
          onValueChange={(v) => (v ? void phone.enable() : phone.disable())}
          trackColor={{ true: colors.accent, false: '#C9C5BB' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {phone.status === 'unsupported' ? (
        <Txt size={13} color={colors.muted} style={st.pad}>Disponible uniquement dans l'appli installée sur le téléphone.</Txt>
      ) : null}
      {phone.status === 'denied' ? (
        <View style={[st.pad, { gap: 8 }]}>
          <Txt size={14} color={colors.danger}>Accès aux agendas refusé par Android.</Txt>
          <Button label="Autoriser dans les réglages Android" kind="dark" onPress={openAppSettings} />
        </View>
      ) : null}
      {phone.status === 'error' ? (
        <Txt size={13} color={colors.danger} selectable style={st.pad}>Problème de lecture : {phone.error}</Txt>
      ) : null}

      {phone.status === 'on' ? (
        <View>
          {phone.calendars.map((c) => {
            const shown = !phone.hidden.includes(c.id);
            return (
              <Pressable
                key={c.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: shown }}
                onPress={() => phone.toggleCalendar(c.id)}
                style={st.calRow}
              >
                <View style={[st.box, { borderColor: c.color }, shown && { backgroundColor: c.color }]}>
                  {shown ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt size={15}>{c.title}</Txt>
                  {c.account && c.account !== c.title ? <Txt size={12} color={colors.muted}>{c.account}</Txt> : null}
                </View>
              </Pressable>
            );
          })}
          <View style={[st.pad, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <Txt size={13} color={colors.muted} style={{ flex: 1 }}>
              {phone.count} événement{phone.count > 1 ? 's' : ''} lu{phone.count > 1 ? 's' : ''}
              {phone.lastSync ? ` · mis à jour à ${new Date(phone.lastSync).toTimeString().slice(0, 5)}` : ''}
            </Txt>
            <Pressable accessibilityRole="button" onPress={() => void phone.refresh()} hitSlop={8}>
              <Txt bold size={14} color={colors.accent}>Actualiser</Txt>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  group: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  pad: { paddingHorizontal: 14, paddingVertical: 10 },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
