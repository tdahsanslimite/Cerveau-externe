// Encadré « coach » en haut de l'accueil (seulement l'accueil, visible avant d'entrer dans un module).
// Jours 1 à 3 : « Une question sur l'appli ? » → WhatsApp. Dès le 4e jour : « Envoie ton journal » → feuille d'envoi.
// Logique dans model.ts ; tout passe par WhatsApp, rien ne part sans que l'utilisateur appuie sur Envoyer.
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Button, Chip, Field, Icon, Sheet, Txt } from '../ui';
import { todayKey } from '../calendar/dates';
import { useSettings } from '../settings/SettingsContext';
import { useJournal } from '../journal/JournalContext';
import { asksSleepTimes } from '../journal/model';
import { COACH, coachStage, firstUseDay, journalText, MAX_TEXT, QUESTION_TEXT, whatsappUrl } from './model';

/** Ouvre WhatsApp ; sans WhatsApp sur le téléphone, la feuille de partage du téléphone prend le relais. */
async function openWhatsApp(text: string) {
  try {
    await Linking.openURL(whatsappUrl(text));
  } catch {
    await Share.share({ message: text }).catch(() => undefined);
  }
}

export function CoachBanner() {
  const { settings, loaded, update } = useSettings();
  const { entries, loaded: journalLoaded } = useJournal();
  const [sending, setSending] = useState(false);
  const today = todayKey();

  // Premier jour d'ouverture, enregistré une seule fois.
  useEffect(() => {
    if (loaded && !settings.firstOpenDay) update({ firstOpenDay: today });
  }, [loaded, settings.firstOpenDay, today, update]);

  if (!loaded || !journalLoaded) return null;
  const stage = coachStage(firstUseDay(settings.firstOpenDay, entries, today), today, entries);

  return (
    <View style={st.card}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={st.icon}>
          <Icon name={stage === 'question' ? 'message-circle' : 'send'} size={22} color={colors.accentDark} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          {stage === 'question' ? (
            <>
              <Txt bold size={17} color={colors.accentDark}>Une question sur l'appli ?</Txt>
              <Txt size={14} color={colors.accentDark} style={{ lineHeight: 20 }}>
                {`Écris-moi directement sur WhatsApp, je te réponds moi-même. — ${COACH.name}, coach TDAH`}
              </Txt>
            </>
          ) : (
            <>
              <Txt bold size={17} color={colors.accentDark}>{`Envoie ton journal à ${COACH.name}`}</Txt>
              <Txt size={14} color={colors.accentDark} style={{ lineHeight: 20 }}>
                Coach TDAH : on le lit ensemble lors d'un premier appel offert, pour comprendre ce qui se répète.
              </Txt>
            </>
          )}
        </View>
      </View>
      <View style={st.actions}>
        {stage === 'journal' ? (
          <Pressable accessibilityRole="button" onPress={() => openWhatsApp(QUESTION_TEXT)} hitSlop={6} style={({ pressed }) => [st.secondary, pressed && { opacity: 0.6 }]}>
            <Txt size={14} color={colors.accentDark}>Juste une question</Txt>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => (stage === 'question' ? openWhatsApp(QUESTION_TEXT) : setSending(true))}
          style={({ pressed }) => [st.primary, pressed && { opacity: 0.8 }]}
        >
          <Icon name={stage === 'question' ? 'message-circle' : 'send'} size={16} color="#FFFFFF" />
          <Txt bold size={15} color="#FFFFFF">{stage === 'question' ? 'Écrire sur WhatsApp' : 'Envoyer mon journal'}</Txt>
        </Pressable>
      </View>
      <SendJournalSheet visible={sending} onClose={() => setSending(false)} />
    </View>
  );
}

const PERIODS = [7, 14, 30];

/** Choisir quoi envoyer, relire le texte exact, puis ouvrir WhatsApp avec le message prêt. */
function SendJournalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { entries, prefs } = useJournal();
  const [days, setDays] = useState(7);
  const [comments, setComments] = useState(true);
  const today = todayKey();
  const text = journalText(entries, today, { days, fields: prefs.fields, comments, sleepTimes: asksSleepTimes(prefs) });
  const tooLong = text.length > MAX_TEXT;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Envoyer mon journal à ${COACH.name}`}
      footer={
        <Button
          label={tooLong ? 'Trop long : réduis la période' : 'Ouvrir WhatsApp'}
          icon="send"
          kind={tooLong ? 'ghost' : 'primary'}
          onPress={() => { if (!tooLong) { openWhatsApp(text); onClose(); } }}
        />
      }
    >
      <Field label="Période">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PERIODS.map((n) => <Chip key={n} label={`${n} jours`} selected={days === n} onPress={() => setDays(n)} />)}
        </View>
      </Field>
      <Field label="Mes commentaires">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Avec" selected={comments} onPress={() => setComments(true)} />
          <Chip label="Notes seulement" selected={!comments} onPress={() => setComments(false)} />
        </View>
      </Field>
      <Field label="Ce qui sera envoyé, mot pour mot">
        <ScrollView style={st.preview} nestedScrollEnabled>
          <Txt size={13} style={{ lineHeight: 19 }} selectable>{text}</Txt>
        </ScrollView>
      </Field>
      <Txt size={13} color={colors.muted} style={{ lineHeight: 19 }}>
        {`Rien ne part tout seul : WhatsApp s'ouvre avec ce message, tu peux encore le modifier, et c'est toi qui appuies sur Envoyer. Ton journal n'est envoyé qu'à ${COACH.name}.`}
      </Txt>
    </Sheet>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.sandSoft, borderRadius: radius.l, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.sand },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' },
  primary: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accentDark, borderRadius: radius.m,
    paddingHorizontal: 16, minHeight: 44,
  },
  secondary: { paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' },
  preview: {
    maxHeight: 240, borderRadius: radius.m, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 12,
  },
});
