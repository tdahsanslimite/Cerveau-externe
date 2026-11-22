// « Envie d'aller plus loin ? » (22 nov., décision de Valentin ; remplace le grand encadré coach du même jour) :
// un seul petit bouton sur l'accueil, qui ouvre une page HORS de l'appli (FURTHER_URL) pour transmettre ses données
// à Valentin et réserver un appel gratuit de 45 min. Position (en haut / sous Paramètres) : coach/model.ts.
// La page ramène dans l'appli par le lien cerveauexterne://envoi-journal → feuille d'envoi du journal (CoachLinkHost).
// Tout passe par WhatsApp, rien ne part sans que l'utilisateur appuie sur Envoyer.
import React, { useEffect, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Button, Chip, Field, Icon, Sheet, Txt } from '../ui';
import { todayKey } from '../calendar/dates';
import { useSettings } from '../settings/SettingsContext';
import { useJournal } from '../journal/JournalContext';
import { asksSleepTimes } from '../journal/model';
import { COACH, furtherOnTop, isSendJournalLink, journalText, markSeen, MAX_TEXT, whatsappUrl, withBookingLink } from './model';

/** Page « Envie d'aller plus loin ? » : public/aller-plus-loin/index.html, publiée avec la version web sur GitHub Pages. */
export const FURTHER_URL = 'https://tdahsanslimite.github.io/cerveau-externe-telechargement/aller-plus-loin/';

/** Ouvre WhatsApp ; sans WhatsApp sur le téléphone, la feuille de partage du téléphone prend le relais. */
async function openWhatsApp(text: string) {
  try {
    await Linking.openURL(whatsappUrl(text));
  } catch {
    await Share.share({ message: text }).catch(() => undefined);
  }
}

/** Retient chaque jour d'ouverture (au démarrage et à chaque retour dans l'appli) : sert à repérer les absences. */
export function usePresence() {
  const { settings, loaded, update } = useSettings();
  useEffect(() => {
    if (!loaded) return;
    const mark = () => {
      const today = todayKey();
      if (settings.lastSeenDay === today) return;
      update(markSeen({ lastSeenDay: settings.lastSeenDay, comebackDay: settings.comebackDay }, today));
    };
    mark();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') mark(); });
    return () => sub.remove();
  }, [loaded, settings.lastSeenDay, settings.comebackDay, update]);
  // Premier jour d'ouverture, enregistré une seule fois (gardé : sert au jour 1 d'utilisation).
  useEffect(() => {
    if (loaded && !settings.firstOpenDay) update({ firstOpenDay: todayKey() });
  }, [loaded, settings.firstOpenDay, update]);
}

/** Le bouton est-il en haut de l'accueil ? (null tant que les réglages ne sont pas lus) */
export function useFurtherOnTop(): boolean | null {
  const { settings, loaded } = useSettings();
  if (!loaded) return null;
  return furtherOnTop(settings.furtherOpenedDay, settings.comebackDay);
}

/** Le petit bouton « Envie d'aller plus loin ? » : ouvre la page externe et retient le jour (il descend). */
export function FurtherButton() {
  const { update } = useSettings();
  const open = () => {
    update({ furtherOpenedDay: todayKey() });
    Linking.openURL(FURTHER_URL).catch(() => undefined);
  };
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Envie d'aller plus loin ? Ouvre une page hors de l'appli"
      onPress={open}
      style={({ pressed }) => [st.further, pressed && { opacity: 0.75 }]}
    >
      <Icon name="compass" size={18} color={colors.accentDark} />
      <Txt bold size={15} color={colors.accentDark} style={{ flex: 1 }}>Envie d'aller plus loin ?</Txt>
      <Icon name="external-link" size={16} color={colors.accentDark} />
    </Pressable>
  );
}

/** Écoute le lien cerveauexterne://envoi-journal (depuis la page externe) et ouvre la feuille d'envoi du journal. */
export function CoachLinkHost() {
  const [sending, setSending] = useState(false);
  useEffect(() => {
    Linking.getInitialURL().then((u) => { if (isSendJournalLink(u)) setSending(true); }).catch(() => undefined);
    const sub = Linking.addEventListener('url', ({ url }) => { if (isSendJournalLink(url)) setSending(true); });
    return () => sub.remove();
  }, []);
  return <SendJournalSheet visible={sending} onClose={() => setSending(false)} />;
}

/** Bouton « Envoyer mon journal à Valentin » (Paramètres › Journal) : secours si le lien de la page ne marche pas. */
export function SendJournalButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button label={`Envoyer mon journal à ${COACH.name}`} kind="ghost" icon="send" onPress={() => setOpen(true)} />
      <SendJournalSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const PERIODS = [7, 14, 30];

/**
 * Choisir quoi envoyer, relire le texte exact, puis ouvrir WhatsApp avec le message prêt.
 * Envoyer sur WhatsApp fait sortir de l'appli : la feuille ne se ferme donc pas, elle passe à l'étape « Réserver
 * mon appel » (22 nov., Valentin : au retour on n'est plus sur la page qui montrait Calendly). Données d'abord, appel ensuite.
 */
export function SendJournalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { entries, prefs } = useJournal();
  const [days, setDays] = useState(7);
  const [comments, setComments] = useState(true);
  const [sent, setSent] = useState(false);
  const today = todayKey();
  const text = withBookingLink(journalText(entries, today, { days, fields: prefs.fields, comments, sleepTimes: asksSleepTimes(prefs) }));
  const tooLong = text.length > MAX_TEXT;
  const close = () => { setSent(false); onClose(); };

  if (sent) {
    return (
      <Sheet
        visible={visible}
        onClose={close}
        title="Dernière étape"
        footer={
          <>
            <Button label="Réserver mon appel gratuit" icon="calendar" onPress={() => { Linking.openURL(COACH.calendly).catch(() => undefined); close(); }} />
            <Button label="Je n'ai pas encore envoyé" kind="ghost" icon="send" onPress={() => setSent(false)} />
          </>
        }
      >
        <Txt size={16} style={{ lineHeight: 23 }}>
          {`Ton journal est parti sur WhatsApp ? Réserve maintenant ton appel gratuit de 45 min avec ${COACH.name}.`}
        </Txt>
        <Txt size={14} color={colors.muted} style={{ lineHeight: 20 }}>
          {`${COACH.name} analysera tes données en amont et vous pourrez faire le point lors de l'appel. Tu vois seulement les créneaux au sein desquels ${COACH.name} est disponible.`}
        </Txt>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={`Envoyer mon journal à ${COACH.name}`}
      footer={
        <Button
          label={tooLong ? 'Trop long : réduis la période' : 'Ouvrir WhatsApp'}
          icon="send"
          kind={tooLong ? 'ghost' : 'primary'}
          onPress={() => { if (!tooLong) { openWhatsApp(text); setSent(true); } }}
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
      <Txt size={14} bold color={colors.accentDark} style={{ lineHeight: 20 }}>
        Une fois ton message envoyé, touche le lien en bas de ton message dans WhatsApp pour réserver ton appel gratuit.
      </Txt>
    </Sheet>
  );
}

const st = StyleSheet.create({
  further: {
    flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', minHeight: 48,
    backgroundColor: colors.sandSoft, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.sand, paddingHorizontal: 18,
  },
  preview: {
    maxHeight: 240, borderRadius: radius.m, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 12,
  },
});
