// Aperçu de la journée dans la fiche d'événement, façon agenda Google :
// on voit tout ce qui est déjà prévu, ce qu'on est en train d'ajouter (en pointillés)
// et, en rouge, ce qui bloque. Décision de Valentin (21 oct.) : « tout voir d'un coup ».
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';
import { Txt } from '../ui';
import { useCalendar } from './CalendarContext';
import { DayKey, labelDayShort, minutesToLabel } from './dates';
import { CalendarEvent, endOf, kindsOf, occurrencesOn } from './model';

const PX_PER_MIN = 0.5; // 30 px par heure
const LABEL_W = 42;

interface Block { id: string; title: string; from: number; to: number; color: string; isNew: boolean; blocking: boolean; kind: string }

/** Répartit les blocs en colonnes quand ils se chevauchent (tâche posée sur un événement…). */
function lanes(blocks: Block[]): { block: Block; lane: number; of: number }[] {
  const sorted = [...blocks].sort((a, b) => a.from - b.from || b.to - a.to);
  const out: { block: Block; lane: number; of: number }[] = [];
  let cluster: { block: Block; lane: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const of = Math.max(1, ...cluster.map((c) => c.lane + 1));
    cluster.forEach((c) => out.push({ ...c, of }));
    cluster = [];
  };
  for (const b of sorted) {
    if (b.from >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    const used = new Set(cluster.filter((c) => c.block.to > b.from).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ block: b, lane });
    clusterEnd = Math.max(clusterEnd, b.to);
  }
  flush();
  return out;
}

const kindLabel = (e: CalendarEvent) => {
  const k = kindsOf(e);
  return k.includes('rdv') ? 'Événement' : k.includes('tache') ? 'Tâche' : 'Objet';
};

export function DayPreview({ day, candidate, blockingId }: { day: DayKey; candidate: CalendarEvent; blockingId: string | null }) {
  const { events, domain } = useCalendar();
  const occs = occurrencesOn(events.filter((x) => x.id !== candidate.id), day);
  const showsCandidate = candidate.date === day || (!!candidate.endDate && day >= candidate.date && day <= candidate.endDate) || candidate.repeat !== 'none';

  const allDay = occs.filter((o) => o.event.start === null);
  const timed: Block[] = occs
    .filter((o) => o.event.start !== null)
    .map((o) => ({
      id: o.event.id, title: o.event.title, from: o.event.start as number, to: endOf(o.event),
      color: domain(o.event.category).color, isNew: false, blocking: o.event.id === blockingId, kind: kindLabel(o.event),
    }));
  if (showsCandidate && candidate.start !== null) {
    timed.push({
      id: '_new', title: candidate.title.trim() || 'Nouveau', from: candidate.start, to: endOf(candidate),
      color: colors.accent, isNew: true, blocking: false, kind: kindLabel(candidate),
    });
  }

  // Plage affichée : au moins 8 h – 21 h, élargie si besoin.
  const first = Math.min(8 * 60, ...timed.map((b) => b.from));
  const last = Math.max(21 * 60, ...timed.map((b) => b.to));
  const startH = Math.floor(first / 60);
  const endH = Math.min(24, Math.ceil(last / 60));
  const height = (endH - startH) * 60 * PX_PER_MIN;
  const y = (min: number) => (min - startH * 60) * PX_PER_MIN;

  return (
    <View style={st.wrap} accessibilityLabel={`Ta journée du ${labelDayShort(day)}`}>
      <View style={st.head}>
        <Txt bold size={14}>Ta journée · {labelDayShort(day)}</Txt>
        <Txt size={12} color={colors.muted}>{occs.length} déjà prévu{occs.length > 1 ? 's' : ''}</Txt>
      </View>

      {allDay.length > 0 || (showsCandidate && candidate.start === null) ? (
        <View style={{ gap: 4 }}>
          {allDay.map((o) => {
            const blocking = o.event.id === blockingId;
            return (
              <View key={o.event.id} style={[st.chip, { borderLeftColor: domain(o.event.category).color }, blocking && st.blocking]}>
                <Txt size={13} numberOfLines={1} style={{ flex: 1 }}>
                  {o.event.title}{o.event.endDate ? ` · jusqu'au ${labelDayShort(o.event.endDate)}` : ''}
                </Txt>
                {blocking ? <Txt bold size={12} color={colors.danger}>bloque</Txt> : <Txt size={12} color={colors.muted}>journée</Txt>}
              </View>
            );
          })}
          {showsCandidate && candidate.start === null ? (
            <View style={[st.chip, st.newChip]}>
              <Txt bold size={13} numberOfLines={1} style={{ flex: 1 }} color={colors.accentDark}>{candidate.title.trim() || 'Nouveau'}</Txt>
              <Txt size={12} color={colors.accentDark}>journée</Txt>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ height, position: 'relative' }}>
        {Array.from({ length: endH - startH + 1 }, (_, i) => (
          <View key={i} style={[st.hourLine, { top: i * 60 * PX_PER_MIN }]}>
            <Txt size={10} color={colors.faint} style={st.hourLabel}>{minutesToLabel((startH + i) * 60)}</Txt>
          </View>
        ))}
        <View style={st.lanes}>
          {lanes(timed).map(({ block: b, lane, of }) => {
            const h = Math.max(16, (b.to - b.from) * PX_PER_MIN - 2);
            return (
              <View
                key={b.id}
                style={[
                  st.block,
                  {
                    top: y(b.from) + 1, height: h,
                    left: `${(lane / of) * 100}%`, width: `${100 / of}%`,
                    borderLeftColor: b.color,
                  },
                  b.isNew && st.newBlock,
                  b.blocking && st.blocking,
                ]}
              >
                <Txt bold size={11} numberOfLines={h > 30 ? 2 : 1} color={b.isNew ? colors.accentDark : b.blocking ? colors.danger : colors.ink}>
                  {b.blocking ? 'Bloque : ' : ''}{b.title}
                </Txt>
                {h > 30 ? (
                  <Txt size={10} color={colors.muted} numberOfLines={1}>{minutesToLabel(b.from)}–{minutesToLabel(b.to)} · {b.kind}</Txt>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
      <Txt size={11} color={colors.muted}>En pointillés : ce que tu ajoutes. En rouge : ce qui bloque.</Txt>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: radius.m, borderWidth: 1, borderColor: colors.line, padding: 10, gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6,
    backgroundColor: '#F7F5F0', borderLeftWidth: 4,
  },
  newChip: { backgroundColor: colors.accentSoft, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent, borderLeftWidth: 1.5 },
  hourLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  hourLabel: { position: 'absolute', top: -7, left: 0, width: LABEL_W - 6, backgroundColor: colors.card },
  lanes: { position: 'absolute', top: 0, bottom: 0, left: LABEL_W, right: 0 },
  block: {
    position: 'absolute', borderRadius: 6, backgroundColor: '#EEF1F5', borderLeftWidth: 4, paddingHorizontal: 5, paddingVertical: 2,
    overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF',
  },
  newBlock: { backgroundColor: colors.accentSoft, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accent, borderLeftWidth: 4 },
  blocking: { backgroundColor: '#FBE9E5', borderWidth: 2, borderColor: colors.danger },
});
