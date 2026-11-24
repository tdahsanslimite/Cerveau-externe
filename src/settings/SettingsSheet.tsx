// Réglages, rangés par module (22 nov., demande de Valentin) :
// - chaque bloc (CalendarSection, ProgrammerSection…) ne contient que ce qui concerne SON module ;
// - Paramètres (bouton de l'accueil, SettingsScreen) les montre TOUS, l'un sous l'autre, avec le nom du module en titre ;
// - la pastille réglages d'un module (ModuleSettingsSheet) ne montre que le sien.
// Ajouter un réglage : dans le bloc de son module, il apparaît alors aux deux endroits.
import React, { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, TOUCH } from '../theme';
import { Button, Chip, Field, IconButton, Sheet, Txt } from '../ui';
import type { ModuleId } from '../home/modules';
import { moduleById } from '../home/modules';
import { useJournal } from '../journal/JournalContext';
import { JournalPrefsFields } from '../journal/JournalSettings';
import { ThemesSheet } from '../goals/ThemeSheets';
import { SendJournalButton } from '../coach/CoachBanner';
import { DomainsEditor } from './DomainsEditor';
import { PhoneCalendarsSettings } from './PhoneCalendarsSettings';
import { BamSettings } from './BamSettings';
import { RemindersSettings } from './RemindersSettings';
import { CalendarView, useSettings } from './SettingsContext';
import { TimePickerChoice } from './TimeSelector';

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'annee', label: 'Année' },
];

/** Sous-titre d'un groupe de réglages (« Agendas du téléphone », « Rappels »…). */
export function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 }}>{children}</Txt>
  );
}

/** Deux choix côte à côte (Afficher / Masquer, Oui / Non…). */
function TwoChoices({ label, hint, value, yes, no, onChange }: {
  label: string; hint?: string; value: boolean; yes: string; no: string; onChange: (v: boolean) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label={yes} selected={value} onPress={() => onChange(true)} />
        <Chip label={no} selected={!value} onPress={() => onChange(false)} />
      </View>
    </Field>
  );
}

// ——— Blocs, un par module ———

export function GeneralSection() {
  const { settings, update } = useSettings();
  return (
    <View style={{ gap: 18 }}>
      <TimePickerChoice />
      <TwoChoices
        label="Boutons tutoriel (?)"
        hint="En haut à droite de chaque module, pour revoir sa vidéo."
        value={!settings.hideTutorials}
        yes="Afficher"
        no="Masquer"
        onChange={(v) => update({ hideTutorials: !v })}
      />
      <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4, lineHeight: 19 }}>
        Tes données restent sur ce téléphone.
      </Txt>
    </View>
  );
}

export function CalendarSection() {
  const { settings, update } = useSettings();
  const limit = settings.dailyLimit;
  return (
    <View style={{ gap: 18 }}>
      <View style={st.group}>
        <View style={st.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt bold>Ma limite par jour</Txt>
            <Txt size={13} color={colors.muted}>Au-delà, la journée est signalée trop chargée.</Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Baisser la limite" onPress={() => update({ dailyLimit: Math.max(1, limit - 1) })} style={st.step}>
              <Txt bold size={20}>−</Txt>
            </Pressable>
            <Txt bold size={18} style={{ width: 28, textAlign: 'center' }}>{limit}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="Augmenter la limite" onPress={() => update({ dailyLimit: Math.min(20, limit + 1) })} style={st.step}>
              <Txt bold size={20}>+</Txt>
            </Pressable>
          </View>
        </View>
        <View style={[st.row, { flexDirection: 'column', alignItems: 'stretch', gap: 10, borderBottomWidth: 0 }]}>
          <Txt bold>Vue à l'ouverture</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {VIEWS.map((v) => (
              <Chip key={v.id} label={v.label} selected={settings.startView === v.id} onPress={() => update({ startView: v.id })} />
            ))}
          </View>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <GroupLabel>Agendas du téléphone (Google…)</GroupLabel>
        <PhoneCalendarsSettings />
      </View>
      <View style={{ gap: 8 }}>
        <GroupLabel>Planning du travail (BAM)</GroupLabel>
        <BamSettings />
      </View>
      <View style={{ gap: 8 }}>
        <GroupLabel>Rappels</GroupLabel>
        <RemindersSettings />
      </View>
      <View style={{ gap: 8 }}>
        <GroupLabel>Domaines</GroupLabel>
        <DomainsEditor />
      </View>
    </View>
  );
}

/** Programmer : les domaines (aussi utilisés par les idées), seulement dans sa pastille (dans Paramètres : sous Calendrier). */
export function ProgrammerSection({ withDomains = false }: { withDomains?: boolean }) {
  return (
    <View style={{ gap: 18 }}>
      {withDomains ? (
        <View style={{ gap: 8 }}>
          <GroupLabel>Domaines</GroupLabel>
          <DomainsEditor />
        </View>
      ) : null}
    </View>
  );
}

export function RoutinesSection() {
  const { settings, update } = useSettings();
  return (
    <TwoChoices
      label="Pastille rouge de retard"
      hint="Un point rouge à côté de « Routines » à midi, 18 h et 22 h quand des routines ne sont pas cochées."
      value={!settings.hideRoutineDot}
      yes="Afficher"
      no="Masquer"
      onChange={(v) => update({ hideRoutineDot: !v })}
    />
  );
}

/** Journal : appliqué tout de suite (la fenêtre du Journal, elle, garde son bouton Valider). */
export function JournalSection() {
  const { prefs, setPrefs } = useJournal();
  return (
    <View style={{ gap: 18 }}>
      <JournalPrefsFields value={prefs} onChange={(f) => setPrefs(f(prefs))} fallbackPicker={prefs.picker} />
      <SendJournalButton />
    </View>
  );
}

export function GoalsSection() {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4 }}>Les thèmes sur lesquels tu veux avancer.</Txt>
      <Button label="Choisir mes thèmes" kind="ghost" icon="target" onPress={() => setOpen(true)} />
      <ThemesSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}

export function BreathingSection() {
  const { settings, update } = useSettings();
  return (
    <View style={{ gap: 18 }}>
      <TwoChoices label="Son à chaque temps" value={settings.breathSound !== false} yes="Oui" no="Non" onChange={(v) => update({ breathSound: v })} />
      <TwoChoices label="Vibration à chaque temps" value={settings.breathVibrate !== false} yes="Oui" no="Non" onChange={(v) => update({ breathVibrate: v })} />
    </View>
  );
}

/**
 * Le bloc de réglages de chaque module, dans l'ordre des Paramètres. `null` = rien à régler (pas de pastille).
 * Journal et Objectifs gardent en plus leur propre fenêtre (premier passage du Journal, « Mes thèmes »).
 */
export const MODULE_SETTINGS: Partial<Record<ModuleId, () => React.ReactElement>> = {
  journal: () => <JournalSection />,
  routines: () => <RoutinesSection />,
  objectifs: () => <GoalsSection />,
  calendrier: () => <CalendarSection />,
  respiration: () => <BreathingSection />,
};

/** Modules où l'on règle une heure : leur pastille rappelle le choix roulette / horloge (qui vaut pour toute l'appli). */
const TIME_MODULES: ModuleId[] = ['calendrier', 'taches', 'reveil'];

/** Fenêtre « Réglages » d'un module : seulement ce qui concerne ce module. */
export function ModuleSettingsSheet({ module, visible, onClose }: { module: ModuleId; visible: boolean; onClose: () => void }) {
  const own = module === 'taches' ? <ProgrammerSection withDomains /> : MODULE_SETTINGS[module]?.() ?? null;
  const body = (
    <>
      {TIME_MODULES.includes(module) ? <TimePickerChoice /> : null}
      {own}
    </>
  );
  return (
    <Sheet visible={visible} onClose={onClose} title={`Réglages · ${moduleById(module).label}`} footer={<Button label="Terminé" icon="check" onPress={onClose} />}>
      {body}
      <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4, lineHeight: 19 }}>
        Tous les réglages de l’appli : bouton « Paramètres » en bas de l’accueil.
      </Txt>
    </Sheet>
  );
}

/** Pastille réglages en haut d'un module : ouvre ses réglages (rien s'il n'a rien à régler). */
export function ModuleSettingsButton({ module }: { module: ModuleId }) {
  const [open, setOpen] = useState(false);
  if (!MODULE_SETTINGS[module] && !TIME_MODULES.includes(module)) return null;
  return (
    <>
      <IconButton icon="settings" label={`Réglages ${moduleById(module).label}`} onPress={() => setOpen(true)} />
      <ModuleSettingsSheet module={module} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const st = StyleSheet.create({
  group: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  step: { width: TOUCH, height: TOUCH, borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
});
