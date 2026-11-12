// Écran Réveil : la liste des réveils (heure, titre, jours, son, interrupteur) et l'éditeur d'un réveil.
// Pas de snooze : un réveil sonne jusqu'à « J'arrête » (décision de Valentin, 12 nov.).
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TimeWheel } from '../calendar/TimeWheel';
import { colors, fonts, radius } from '../theme';
import { Button, Card, Chip, Field, Icon, SectionLabel, Sheet, Txt } from '../ui';
import {
  ALL_WEEK, APP_SOUNDS, countOn, daysText, formatTime, MAX_ALARMS, newAlarm, nextOverall, nextRing, sortAlarms,
  soundLabel, TITLE_IDEAS, untilText, WakeAlarm, whenText, WORK_WEEK,
} from './model';
import { openReveilSettings, pickPhoneRingtone, previewSound, reveilAvailable, stopPreview } from './native';
import { useReveil } from './ReveilContext';

const DAY_LETTER = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAME = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const newId = () => `rv${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Heure courante, rafraîchie chaque minute (pour « dans 7 h 05 »). */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function ReveilScreen() {
  const insets = useSafeAreaInsets();
  const { alarms, setOn, status, problem, refreshStatus } = useReveil();
  const now = useNow();
  const [editing, setEditing] = useState<{ alarm: WakeAlarm; isNew: boolean } | null>(null);

  const next = nextOverall(alarms, now);
  const sorted = sortAlarms(alarms);
  const today = countOn(alarms, now, now);
  const full = alarms.length >= MAX_ALARMS;

  const warnings: { text: string; action: string; kind: 'exact' | 'fullScreen' | 'notifications' }[] = [];
  if (status && !status.exact) warnings.push({ text: 'Android n’autorise pas les alarmes à l’heure exacte : un réveil peut sonner en retard.', action: 'Autoriser', kind: 'exact' });
  if (status && !status.notifications) warnings.push({ text: 'Les notifications sont coupées : le réveil sonnera, mais sans le bouton « J’arrête » dans la notification.', action: 'Activer', kind: 'notifications' });
  if (status && !status.fullScreen) warnings.push({ text: 'L’écran du réveil ne peut pas s’afficher par-dessus l’écran verrouillé.', action: 'Autoriser', kind: 'fullScreen' });

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}>
        <View style={st.hero}>
          <Txt size={13} color={colors.sand} style={st.eyebrow}>Prochain réveil</Txt>
          {next ? (
            <>
              <Txt bold size={34} color="#FFFFFF">{formatTime(next.alarm.minutes)}</Txt>
              <Txt size={16} color="#FFFFFF">{next.alarm.title} · {whenText(next.at, now).split(' à ')[0]}</Txt>
              <Txt size={14} color={colors.sandSoft}>Sonne {untilText(next.at, now)}</Txt>
            </>
          ) : (
            <Txt bold size={22} color="#FFFFFF">Aucun réveil allumé</Txt>
          )}
          <Txt size={13} color={colors.sandSoft} style={{ marginTop: 4 }}>
            {today === 0 ? 'Rien ne sonne aujourd’hui' : today === 1 ? '1 réveil aujourd’hui' : `${today} réveils aujourd’hui`}
          </Txt>
        </View>

        {!reveilAvailable ? (
          <Card style={st.warn}>
            <Txt size={14} color={colors.warnDark}>
              Ici, le réveil ne peut pas sonner (aperçu web ou ancienne version de l’appli). Sur ton téléphone Android à jour, il sonne même appli fermée.
            </Txt>
          </Card>
        ) : null}
        {warnings.map((w) => (
          <Card key={w.kind} style={st.warn}>
            <Txt size={14} color={colors.warnDark}>{w.text}</Txt>
            <Button
              kind="ghost"
              label={w.action}
              icon="settings"
              onPress={() => {
                openReveilSettings(w.kind);
                setTimeout(refreshStatus, 1500);
              }}
            />
          </Card>
        ))}
        {problem ? (
          <Card style={st.warn}>
            <Txt size={14} color={colors.warnDark} selectable>Problème de programmation : {problem}</Txt>
          </Card>
        ) : null}

        <SectionLabel>{`Mes réveils (${alarms.length})`}</SectionLabel>
        {sorted.length === 0 ? (
          <Txt size={15} color={colors.muted} style={{ paddingHorizontal: 4 }}>
            Ajoute ton premier réveil : une heure, à quoi il sert, les jours et un son.
          </Txt>
        ) : null}
        {sorted.map((a) => {
          const at = nextRing(a, now);
          return (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              accessibilityLabel={`Réveil ${formatTime(a.minutes)}, ${a.title}, ${daysText(a.days)}, ${a.on ? 'allumé' : 'éteint'}`}
              onPress={() => setEditing({ alarm: a, isNew: false })}
              style={({ pressed }) => [st.row, !a.on && st.rowOff, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Txt bold size={34} color={a.on ? colors.ink : colors.faint}>{formatTime(a.minutes)}</Txt>
                <Txt bold size={16} color={a.on ? colors.ink : colors.muted} numberOfLines={1}>{a.title}</Txt>
                <Txt size={13} color={colors.muted} numberOfLines={1}>
                  {daysText(a.days)} · {soundLabel(a)}
                </Txt>
                {a.on && at ? <Txt size={13} color={colors.accent}>{whenText(at, now)}</Txt> : null}
              </View>
              <Switch
                accessibilityLabel={a.on ? 'Éteindre ce réveil' : 'Allumer ce réveil'}
                value={a.on}
                onValueChange={(v) => setOn(a.id, v)}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor="#FFFFFF"
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {!full ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter un réveil"
          onPress={() => setEditing({ alarm: newAlarm(new Date(), newId()), isNew: true })}
          style={({ pressed }) => [st.fab, pressed && { opacity: 0.85 }]}
        >
          <Icon name="plus" size={22} color="#FFFFFF" />
          <Txt bold size={15} color="#FFFFFF">Ajouter</Txt>
        </Pressable>
      ) : null}

      {editing ? (
        <AlarmEditor
          key={editing.alarm.id}
          initial={editing.alarm}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </View>
  );
}

function AlarmEditor({ initial, isNew, onClose }: { initial: WakeAlarm; isNew: boolean; onClose: () => void }) {
  const { saveAlarm, removeAlarm } = useReveil();
  const [a, setA] = useState<WakeAlarm>(initial);
  const [playing, setPlaying] = useState<string | null>(null);
  const now = new Date();
  const at = nextRing({ ...a, on: true }, now);
  const set = (patch: Partial<WakeAlarm>) => setA((x) => ({ ...x, ...patch }));

  const close = () => {
    stopPreview();
    onClose();
  };
  const save = () => {
    saveAlarm({ ...a, title: a.title.trim() || 'Réveil', on: true });
    close();
  };
  const toggleDay = (d: number) => set({ days: a.days.includes(d) ? a.days.filter((x) => x !== d) : [...a.days, d] });
  const play = (sound: string) => {
    if (playing === sound) {
      stopPreview();
      setPlaying(null);
      return;
    }
    previewSound(sound);
    setPlaying(sound);
    setTimeout(() => setPlaying((p) => (p === sound ? null : p)), 5000);
  };
  const choosePhone = async () => {
    stopPreview();
    setPlaying(null);
    const picked = await pickPhoneRingtone(a.sound.startsWith('uri:') ? a.sound.slice(4) : null);
    if (picked) set({ sound: `uri:${picked.uri}`, soundLabel: picked.title });
  };
  const isPhone = a.sound.startsWith('uri:');

  return (
    <Sheet
      visible
      onClose={close}
      title={isNew ? 'Nouveau réveil' : 'Modifier le réveil'}
      footer={
        <>
          <Button label={isNew ? 'Créer le réveil' : 'Enregistrer'} icon="check" onPress={save} />
          {!isNew ? (
            <Button
              kind="danger"
              label="Supprimer"
              icon="trash-2"
              onPress={() => {
                removeAlarm(a.id);
                close();
              }}
            />
          ) : null}
        </>
      }
    >
      <View style={{ gap: 6 }}>
        <TimeWheel value={a.minutes} onChange={(minutes) => set({ minutes })} step={1} />
        {at ? <Txt size={14} color={colors.accent} style={{ textAlign: 'center' }}>Sonnera {whenText(at, now)} ({untilText(at, now)})</Txt> : null}
      </View>

      <Field label="À quoi il sert ?">
        <TextInput
          value={a.title}
          onChangeText={(title) => set({ title })}
          placeholder="Réveil, médicament, partir…"
          placeholderTextColor={colors.faint}
          maxLength={60}
          style={st.input}
          accessibilityLabel="Titre du réveil"
        />
        <View style={st.wrap}>
          {TITLE_IDEAS.map((t) => (
            <Chip key={t} label={t} selected={a.title.trim() === t} onPress={() => set({ title: t })} />
          ))}
        </View>
      </Field>

      <Field label="Quels jours ?" hint={a.days.length === 0 ? 'Aucun jour choisi : il sonne une seule fois, puis s’éteint.' : undefined}>
        <View style={st.days}>
          {DAY_LETTER.map((l, d) => {
            const on = a.days.includes(d);
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={DAY_NAME[d]}
                onPress={() => toggleDay(d)}
                style={({ pressed }) => [st.day, on && st.dayOn, pressed && { opacity: 0.6 }]}
              >
                <Txt bold size={16} color={on ? '#FFFFFF' : colors.ink}>{l}</Txt>
              </Pressable>
            );
          })}
        </View>
        <View style={st.wrap}>
          <Chip label="Une fois" selected={a.days.length === 0} onPress={() => set({ days: [] })} />
          <Chip label="Lun – ven" selected={daysText(a.days) === 'Lun – ven'} onPress={() => set({ days: WORK_WEEK })} />
          <Chip label="Tous les jours" selected={a.days.length === 7} onPress={() => set({ days: ALL_WEEK })} />
        </View>
      </Field>

      <Field label="Quel son ?" hint={reveilAvailable ? 'Touche ▶ pour écouter 5 secondes, au volume du réveil.' : undefined}>
        <Card>
          {APP_SOUNDS.map((s, i) => {
            const on = a.sound === s.id;
            return (
              <View key={s.id} style={[st.soundRow, i > 0 && st.soundLine]}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => set({ sound: s.id, soundLabel: undefined })}
                  style={st.soundPick}
                >
                  <Icon name={on ? 'check-circle' : 'circle'} size={22} color={on ? colors.accent : colors.faint} />
                  <Txt bold={on} size={16}>{s.label}</Txt>
                </Pressable>
                {reveilAvailable ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Écouter ${s.label}`} onPress={() => play(s.id)} hitSlop={6} style={st.play}>
                    <Icon name={playing === s.id ? 'square' : 'play'} size={18} color={colors.accent} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
          <View style={[st.soundRow, st.soundLine]}>
            <Pressable accessibilityRole="button" onPress={choosePhone} style={st.soundPick}>
              <Icon name={isPhone ? 'check-circle' : 'smartphone'} size={22} color={isPhone ? colors.accent : colors.muted} />
              <View style={{ flex: 1 }}>
                <Txt bold={isPhone} size={16}>Sonnerie du téléphone…</Txt>
                <Txt size={13} color={colors.muted} numberOfLines={1}>
                  {isPhone ? soundLabel(a) : reveilAvailable ? 'Choisir parmi les sonneries d’Android' : 'Seulement sur le téléphone'}
                </Txt>
              </View>
            </Pressable>
            {isPhone && reveilAvailable ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Écouter la sonnerie" onPress={() => play(a.sound)} hitSlop={6} style={st.play}>
                <Icon name={playing === a.sound ? 'square' : 'play'} size={18} color={colors.accent} />
              </Pressable>
            ) : null}
          </View>
        </Card>
      </Field>
    </Sheet>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: colors.accentDark, borderRadius: radius.l, padding: 20, gap: 2 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  warn: { backgroundColor: colors.warnSoft, borderColor: '#F2C9A8', padding: 14, gap: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.l,
    borderWidth: 1, borderColor: colors.line, paddingVertical: 14, paddingHorizontal: 16,
  },
  rowOff: { backgroundColor: colors.paper },
  input: {
    minHeight: 50, borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 14, fontSize: 17, fontFamily: fonts.regular, color: colors.ink,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  dayOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  soundRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 54 },
  soundLine: { borderTopWidth: 1, borderTopColor: colors.lineSoft },
  soundPick: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54 },
  play: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  fab: {
    position: 'absolute', right: 18, bottom: 24, height: 56, paddingHorizontal: 20, borderRadius: 28, backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: colors.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
