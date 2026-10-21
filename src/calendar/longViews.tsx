// Vues longues du calendrier (Trimestre, Année) et la bande des 7 jours sous l'agenda du jour.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDayLoad } from '../load';
import { useSettings } from '../settings/SettingsContext';
import { colors, radius } from '../theme';
import { Card, Icon, SectionLabel, Txt } from '../ui';
import { useCalendar } from './CalendarContext';
import { LOAD_COLOR } from './components';
import { DAY_SHORT, DayKey, fromKey, labelDayShort, minutesToLabel, MONTHS, monthGrid, relativeLabel, todayKey, weekDays } from './dates';
import { endOf, isDoneOn, isTask, loadLevel, occurrencesOn } from './model';
import { tasksOn } from '../tasks/model';
import { useTaskItems } from '../tasks/useTaskItems';

const pad = (n: number) => String(n).padStart(2, '0');

/** Premier jour du mois `offset` mois après le mois de `key`. */
function monthStart(key: DayKey, offset = 0): DayKey {
  const d = fromKey(key);
  const m = new Date(d.getFullYear(), d.getMonth() + offset, 1, 12);
  return `${m.getFullYear()}-${pad(m.getMonth() + 1)}-01`;
}

/** Les 3 mois du trimestre qui contient `key` (janv.–mars, avr.–juin…). */
export function quarterMonths(key: DayKey): DayKey[] {
  const d = fromKey(key);
  const first = `${d.getFullYear()}-${pad(Math.floor(d.getMonth() / 3) * 3 + 1)}-01`;
  return [0, 1, 2].map((i) => monthStart(first, i));
}

export const quarterOf = (key: DayKey) => Math.floor(fromKey(key).getMonth() / 3) + 1;

const MONTHS_SHORT = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

/** « Oct. – déc. 2026 » : tient dans l'en-tête d'un téléphone. */
export function labelQuarter(key: DayKey): string {
  const [a, , c] = quarterMonths(key).map((k) => fromKey(k));
  return `${MONTHS_SHORT[a.getMonth()]} – ${MONTHS_SHORT[c.getMonth()].toLowerCase()} ${c.getFullYear()}`;
}

// ---------------- Mini-mois (partagé par Trimestre et Année) ----------------

function MiniMonth({ month, selected, compact, onDay }: {
  month: DayKey; selected: DayKey; compact?: boolean; onDay?: (d: DayKey) => void;
}) {
  const { events, domain } = useCalendar();
  const { settings } = useSettings();
  const load = useDayLoad();
  const today = todayKey();
  const cells = monthGrid(month);
  const cellH = compact ? 16 : 38;

  return (
    <View style={{ gap: compact ? 1 : 4 }}>
      <View style={st.gridRow}>
        {DAY_SHORT.map((d, i) => (
          <Txt key={i} size={compact ? 8 : 12} color={colors.muted} style={st.gridHead}>{d.charAt(0)}</Txt>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, w) => (
        <View key={w} style={[st.gridRow, { gap: compact ? 1 : 4 }]}>
          {cells.slice(w * 7, w * 7 + 7).map((c) => {
            if (!c.inMonth) return <View key={c.key} style={{ flex: 1, height: cellH }} />;
            const occs = occurrencesOn(events, c.key);
            const count = load(c.key);
            const over = count > settings.dailyLimit;
            const isToday = c.key === today;
            const isSel = c.key === selected && !compact;
            const n = fromKey(c.key).getDate();
            if (compact) {
              // Année : un carré par jour, teinté s'il y a quelque chose, rouge au-delà de la limite.
              return (
                <View
                  key={c.key}
                  style={[
                    st.tiny,
                    { height: cellH },
                    occs.length > 0 && { backgroundColor: colors.accentSoft },
                    over && { backgroundColor: '#F6D5CE' },
                    isToday && { backgroundColor: colors.accent },
                  ]}
                >
                  <Txt size={8} bold={isToday} color={isToday ? '#FFFFFF' : colors.ink}>{n}</Txt>
                </View>
              );
            }
            const cats = Array.from(new Set(occs.map((o) => o.event.category))).slice(0, 3);
            return (
              <Pressable
                key={c.key}
                accessibilityRole="button"
                accessibilityLabel={`${labelDayShort(c.key)}, ${occs.length} événement(s). Ouvrir la journée`}
                onPress={() => onDay?.(c.key)}
                style={[
                  st.cell,
                  { height: cellH },
                  isToday && !isSel && { borderColor: colors.accent, borderWidth: 1.5 },
                  isSel && { backgroundColor: colors.accent },
                ]}
              >
                <Txt bold size={13} color={isSel ? '#FFFFFF' : colors.ink}>{n}</Txt>
                <View style={st.dots}>
                  {cats.map((cat) => (
                    <View key={cat} style={[st.dot, { backgroundColor: isSel ? '#FFFFFF' : domain(cat).color }]} />
                  ))}
                </View>
                <View style={[st.overBar, over && { backgroundColor: isSel ? '#FFFFFF' : colors.danger }]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ---------------- TRIMESTRE ----------------

export function QuarterView({ day, onOpenDay }: { day: DayKey; onOpenDay: (d: DayKey) => void }) {
  return (
    <View style={{ gap: 14 }}>
      {quarterMonths(day).map((m) => (
        <Card key={m} style={{ padding: 12, gap: 8 }}>
          <Txt bold size={16} style={{ paddingHorizontal: 4 }}>{MONTHS[fromKey(m).getMonth()].replace(/^./, (c) => c.toUpperCase())}</Txt>
          <MiniMonth month={m} selected={day} onDay={onOpenDay} />
        </Card>
      ))}
      <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4 }}>Touche un jour pour l'ouvrir. Trait rouge : au-dessus de ta limite.</Txt>
    </View>
  );
}

// ---------------- ANNÉE ----------------

export function YearView({ day, onOpenMonth }: { day: DayKey; onOpenMonth: (d: DayKey) => void }) {
  const { events } = useCalendar();
  const year = fromKey(day).getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}-01`);
  const thisMonth = todayKey().slice(0, 7);
  return (
    <View style={{ gap: 12 }}>
      <View style={st.yearGrid}>
        {months.map((m) => {
          const count = monthGrid(m).filter((c) => c.inMonth).reduce((s, c) => s + occurrencesOn(events, c.key).length, 0);
          const current = m.slice(0, 7) === thisMonth;
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityLabel={`${MONTHS[fromKey(m).getMonth()]} : ${count} événement(s). Ouvrir le mois`}
              onPress={() => onOpenMonth(m)}
              style={({ pressed }) => [st.yearMonth, current && { borderColor: colors.accent, borderWidth: 1.5 }, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Txt bold size={13} color={current ? colors.accent : colors.ink}>{MONTHS_SHORT[fromKey(m).getMonth()]}</Txt>
                <Txt size={11} color={colors.muted}>{count || ''}</Txt>
              </View>
              <MiniMonth month={m} selected={day} compact />
            </Pressable>
          );
        })}
      </View>
      <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4, lineHeight: 19 }}>
        Jour teinté : quelque chose de prévu. Rose : au-dessus de ta limite. Le chiffre = nombre d'événements du mois. Touche un mois pour l'ouvrir.
      </Txt>
    </View>
  );
}

// ---------------- Bande des 7 jours (sous l'agenda du jour) ----------------

export function WeekStrip({ day, onSelect }: { day: DayKey; onSelect: (d: DayKey) => void }) {
  const { events, domain } = useCalendar();
  const items = useTaskItems();
  const { settings } = useSettings();
  const load = useDayLoad();
  const today = todayKey();
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>Cette semaine</SectionLabel>
      <Card>
        {weekDays(day).map((d) => {
          const occs = occurrencesOn(events, d);
          const count = load(d);
          const level = loadLevel(count, settings.dailyLimit);
          const isSel = d === day;
          const isToday = d === today;
          const past = d < today;
          // Toute la journée, sans coupe : événements puis idées prévues ce jour (sans heure).
          const dayTasks = tasksOn(items, d).filter((t) => t.source === 'task');
          const empty = occs.length === 0 && dayTasks.length === 0;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={`${labelDayShort(d)}, ${count} sur ${settings.dailyLimit}. Afficher ce jour`}
              onPress={() => onSelect(d)}
              style={({ pressed }) => [st.stripRow, isSel && st.stripSel, pressed && { opacity: 0.7 }]}
            >
              <View style={{ width: 58 }}>
                <Txt bold size={14} color={past && !isSel ? colors.faint : colors.ink}>{labelDayShort(d).split(' ').slice(0, 2).join(' ')}</Txt>
                {isToday ? <Txt size={11} color={colors.accent}>{relativeLabel(d, today)}</Txt> : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                {empty ? <Txt size={13} color={colors.faint}>Libre</Txt> : null}
                {occs.map((o) => {
                  const done = isTask(o.event) && isDoneOn(o.event, d);
                  return (
                    <View key={o.event.id} style={st.line}>
                      <View style={[st.dot, { backgroundColor: domain(o.event.category).color }]} />
                      <Txt size={12} color={colors.muted} style={st.time}>
                        {o.event.start === null ? 'Journée' : `${minutesToLabel(o.event.start)}–${minutesToLabel(endOf(o.event))}`}
                      </Txt>
                      <Txt
                        size={13}
                        numberOfLines={2}
                        style={[{ flex: 1 }, done && { textDecorationLine: 'line-through' }]}
                        color={done || (past && !isSel) ? colors.muted : colors.ink}
                      >
                        {o.event.title}
                      </Txt>
                    </View>
                  );
                })}
                {dayTasks.map((t) => (
                  <View key={t.key} style={st.line}>
                    <Icon name={t.status === 'done' ? 'check-square' : 'square'} size={12} color={colors.muted} />
                    <Txt size={12} color={colors.muted} style={st.time}>Idée</Txt>
                    <Txt
                      size={13}
                      numberOfLines={2}
                      style={[{ flex: 1 }, t.status === 'done' && { textDecorationLine: 'line-through' }]}
                      color={t.status === 'done' || (past && !isSel) ? colors.muted : colors.ink}
                    >
                      {t.title}
                    </Txt>
                  </View>
                ))}
              </View>
              <View style={st.stripLoad}>
                <View style={[st.loadDot, { backgroundColor: count ? LOAD_COLOR[level] : colors.border }]} />
                <Txt size={12} color={level === 'trop' ? colors.danger : colors.muted}>{count}/{settings.dailyLimit}</Txt>
              </View>
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

const st = StyleSheet.create({
  gridRow: { flexDirection: 'row', gap: 4 },
  gridHead: { flex: 1, textAlign: 'center' },
  cell: { flex: 1, borderRadius: radius.s, backgroundColor: '#F7F5F0', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4 },
  tiny: { flex: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  overBar: { width: '60%', height: 3, borderRadius: 2 },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yearMonth: {
    width: '31.5%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.m, borderWidth: 1, borderColor: colors.line,
    padding: 6, gap: 4,
  },
  stripRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 52,
    borderBottomWidth: 1, borderBottomColor: colors.lineSoft,
  },
  stripSel: { backgroundColor: colors.accentSoft },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { width: 76, fontVariant: ['tabular-nums'] },
  stripLoad: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  loadDot: { width: 8, height: 8, borderRadius: 4 },
});
