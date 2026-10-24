// Le « Recap » du Journal : on choisit l'année en haut (n-1, n, n+1), puis ses 12 mois, chacun dépliable
// (on ne voit pas les 365 jours d'un coup). Toucher un mois ouvre la liste de ses jours ; toucher un jour ouvre sa fiche
// (les 3 notes et leurs commentaires), modifiable, avec un retour à la liste là où on l'a laissée.
// Le bouton « Filtre » choisit le mois, bon / mauvais (au-dessus / en dessous de la moyenne) et la note comparée.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DAY_SHORT, DayKey, fromKey, isoWeek, labelDayLong, MONTHS, relativeLabel, todayKey, weekdayIndex } from '../calendar/dates';
import { colors, radius } from '../theme';
import { Button, Card, Chip, Field, Icon, IconButton, Sheet, Txt } from '../ui';
import { DayEditor } from './DayEditor';
import { useJournal } from './JournalContext';
import { FIELDS, formatScore, noteOf, shortSummary } from './model';
import { DayFilter, Metric, METRICS, overallAverage, RecapDay, recapMonths, recapYearTabs, Rel } from './recap';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Couleur d'un jour par rapport à la moyenne : au-dessus = vert-bleu, en dessous = orange, sinon neutre. */
function relColor(rel: Rel | null): string {
  return rel === 'good' ? colors.accent : rel === 'bad' ? colors.warn : colors.ink;
}

export function RecapScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { entries } = useJournal();
  const today = todayKey();
  const currentYear = Number(today.slice(0, 4));
  const yearTabs = recapYearTabs(today);

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | null>(null);
  const [filter, setFilter] = useState<DayFilter>('all');
  const [metric, setMetric] = useState<Metric>('total');
  /** Mois dont l'état est inversé par rapport à l'état par défaut (fermé, ou ouvert quand un filtre est actif). */
  const [toggled, setToggled] = useState<number[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  /** Jour dont la fiche est ouverte par-dessus la liste (la liste reste en place dessous : on y revient au même endroit). */
  const [openDay, setOpenDay] = useState<DayKey | null>(null);

  // Les écrans reçoivent un bas de zone de sécurité à 0 (la barre d'onglets le gère) : on le retrouve ici.
  const bottom = Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0, 12);

  const avg = overallAverage(entries, metric, today);
  const months = recapMonths(entries, year, month, today, metric, avg, filter);
  const metricLabel = METRICS.find((m) => m.id === metric)!.label;
  const openByDefault = filter !== 'all' || month !== null;
  const isOpen = (m: number) => openByDefault !== toggled.includes(m);

  const activeCount = (month !== null ? 1 : 0) + (filter !== 'all' ? 1 : 0) + (metric !== 'total' ? 1 : 0);

  const change = (apply: () => void) => {
    apply();
    setToggled([]); // chaque réglage repart de l'état par défaut des mois
  };
  const reset = () => change(() => { setMonth(null); setFilter('all'); setMetric('total'); });

  const subtitle = (m: (typeof months)[number]): string => {
    if (m.future) return 'À venir';
    if (filter === 'good') return plural(m.days.length, 'bon jour', 'bons jours');
    if (filter === 'bad') return plural(m.days.length, 'mauvais jour', 'mauvais jours');
    if (m.noted === 0) return 'Rien de noté';
    return `${plural(m.noted, 'jour noté', 'jours notés')}${m.average !== null ? ` · moyenne ${formatScore(m.average)}` : ''}`;
  };

  // Retour du téléphone : d'abord on referme la fiche du jour, ensuite seulement le Recap.
  const back = () => (openDay ? setOpenDay(null) : onClose());

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={back}>
      <View style={[st.root, { paddingTop: insets.top, paddingBottom: bottom }]}>
        <View style={st.head}>
          <Txt bold size={24} style={{ flex: 1 }}>Recap</Txt>
          <IconButton icon="x" label="Fermer" onPress={onClose} bordered={false} />
        </View>

        <View style={st.years} accessibilityRole="tablist">
          {yearTabs.map((y) => {
            const on = y === year;
            return (
              <Pressable
                key={y}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Année ${y}`}
                onPress={() => change(() => setYear(y))}
                style={({ pressed }) => [st.yearTab, on && { backgroundColor: colors.accent, borderColor: colors.accent }, pressed && { opacity: 0.7 }]}
              >
                <Txt bold={on} size={17} color={on ? '#FFFFFF' : colors.ink}>{y}</Txt>
              </Pressable>
            );
          })}
        </View>

        <View style={st.info}>
          <Txt size={13} color={colors.muted}>
            {`${metricLabel}${avg !== null ? ` · ta moyenne : ${formatScore(Math.round(avg * 10) / 10)}` : ''}`}
          </Txt>
          {filter !== 'all' ? (
            <Txt size={13} color={colors.muted}>
              {`${filter === 'good' ? 'Bons jours : au-dessus' : 'Mauvais jours : en dessous'} de ta moyenne`}
            </Txt>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
          {months.length === 0 ? (
            <Card style={{ padding: 18 }}>
              <Txt size={14} color={colors.muted} style={{ lineHeight: 21 }}>
                {avg === null && filter !== 'all'
                  ? 'Il faut au moins 3 jours avec cette note pour calculer une moyenne.'
                  : 'Aucun jour ne correspond à ce filtre.'}
              </Txt>
            </Card>
          ) : (
            months.map((m) => {
              const open = !m.future && isOpen(m.month);
              const name = cap(MONTHS[m.month - 1]);
              return (
                <Card key={m.month} style={{ opacity: m.future ? 0.5 : 1 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open, disabled: m.future }}
                    accessibilityLabel={`${name}, ${subtitle(m)}`}
                    disabled={m.future}
                    onPress={() => setToggled((t) => (t.includes(m.month) ? t.filter((x) => x !== m.month) : [...t, m.month]))}
                    style={({ pressed }) => [st.monthRow, pressed && { backgroundColor: colors.lineSoft }]}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt bold size={20}>{name}</Txt>
                      <Txt size={13} color={colors.muted}>{subtitle(m)}</Txt>
                    </View>
                    {m.future ? null : <Icon name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />}
                  </Pressable>
                  {open ? (
                    m.days.length === 0 ? (
                      <Txt size={14} color={colors.muted} style={st.empty}>Aucun jour.</Txt>
                    ) : (
                      m.days.map((d) => <DayRow key={d.day} d={d} onPress={() => setOpenDay(d.day)} />)
                    )
                  ) : null}
                </Card>
              );
            })
          )}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={activeCount ? `Filtre, ${activeCount} réglage${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''}` : 'Filtre'}
          onPress={() => setFilterOpen(true)}
          style={({ pressed }) => [st.fab, { bottom: bottom + 12 }, pressed && { opacity: 0.85 }]}
        >
          <Icon name="filter" size={22} color="#FFFFFF" />
          <Txt bold size={15} color="#FFFFFF">{activeCount ? `Filtre · ${activeCount}` : 'Filtre'}</Txt>
        </Pressable>

        <Sheet
          visible={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="Filtre"
          footer={
            <>
              <Button label="Voir" onPress={() => setFilterOpen(false)} />
              {activeCount ? <Button label="Tout réinitialiser" kind="ghost" onPress={reset} /> : null}
            </>
          }
        >
          <Field label="Mois">
            <View style={st.chips}>
              <Chip label="Tous" selected={month === null} onPress={() => change(() => setMonth(null))} />
              {MONTHS.map((n, i) => (
                <Chip key={n} label={cap(n)} selected={month === i + 1} onPress={() => change(() => setMonth(i + 1))} />
              ))}
            </View>
          </Field>
          <Field label="Jours" hint="Bon = au-dessus de ta moyenne. Mauvais = en dessous.">
            <View style={st.chips}>
              <Chip label="Tous" selected={filter === 'all'} onPress={() => change(() => setFilter('all'))} />
              <Chip label="Bons" selected={filter === 'good'} onPress={() => change(() => setFilter('good'))} />
              <Chip label="Mauvais" selected={filter === 'bad'} color={colors.warn} onPress={() => change(() => setFilter('bad'))} />
            </View>
          </Field>
          <Field label="Note comparée" hint="La moyenne est celle de tous tes jours notés avec cette note.">
            <View style={st.chips}>
              {METRICS.map((m) => <Chip key={m.id} label={m.label} selected={metric === m.id} onPress={() => change(() => setMetric(m.id))} />)}
            </View>
          </Field>
        </Sheet>

        {openDay ? (
          <View style={[StyleSheet.absoluteFill, st.detail, { paddingTop: insets.top, paddingBottom: bottom }]}>
            <View style={st.head}>
              <IconButton icon="chevron-left" label="Retour à la liste" onPress={() => setOpenDay(null)} />
              <View style={{ flex: 1 }}>
                <Txt size={13} color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {relativeLabel(openDay, today) ?? `Semaine ${isoWeek(openDay)}`}
                </Txt>
                <Txt bold size={22} numberOfLines={1}>{labelDayLong(openDay)}</Txt>
              </View>
              <IconButton icon="x" label="Fermer" onPress={onClose} bordered={false} />
            </View>
            <ScrollView contentContainerStyle={st.detailContent} keyboardShouldPersistTaps="handled">
              <DayEditor day={openDay} />
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function DayRow({ d, onPress }: { d: RecapDay; onPress: () => void }) {
  const e = d.entry;
  const summary = e ? shortSummary(e) : '';
  const comment = e ? FIELDS.map((f) => noteOf(e, f).trim()).find((t) => t) : undefined;
  const dayNum = fromKey(d.day).getDate();
  const label = `${DAY_SHORT[weekdayIndex(d.day)]} ${dayNum}`;
  const relText = d.rel === 'good' ? ', au-dessus de ta moyenne' : d.rel === 'bad' ? ', en dessous de ta moyenne' : '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${summary ? ` : ${summary}` : ', rien de noté'}${relText}`}
      onPress={onPress}
      style={({ pressed }) => [st.dayRow, pressed && { backgroundColor: colors.lineSoft }]}
    >
      <View style={[st.mark, d.rel === 'good' && { backgroundColor: colors.accent }, d.rel === 'bad' && { backgroundColor: colors.warn }]} />
      <Txt bold size={15} numberOfLines={1} style={{ width: 66 }}>{label}</Txt>
      <View style={{ flex: 1, gap: 1 }}>
        {summary ? <Txt size={13} color={colors.muted}>{summary}</Txt> : <Txt size={14} color={colors.faint}>—</Txt>}
        {comment ? <Txt size={13} color={colors.muted} numberOfLines={1}>{comment}</Txt> : null}
      </View>
      {d.value !== null ? <Txt bold size={18} color={relColor(d.rel)} style={{ minWidth: 28, textAlign: 'right' }}>{d.value}</Txt> : null}
    </Pressable>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  years: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  yearTab: {
    flex: 1, minHeight: 48, borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { paddingHorizontal: 16, paddingBottom: 10, gap: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 110, gap: 10, maxWidth: 640, width: '100%', alignSelf: 'center' },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 64, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.l },
  empty: { paddingHorizontal: 16, paddingBottom: 14 },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 8, paddingRight: 16, paddingLeft: 12,
    borderTopWidth: 1, borderTopColor: colors.lineSoft,
  },
  mark: { width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: 'transparent' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detail: { backgroundColor: colors.bg },
  detailContent: { paddingHorizontal: 16, paddingBottom: 120, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  fab: {
    position: 'absolute', right: 18, height: 56, paddingHorizontal: 20, borderRadius: 28, backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: colors.accent, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
