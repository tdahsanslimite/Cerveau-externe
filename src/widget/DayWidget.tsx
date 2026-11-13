// Le widget « Ma journée » sur l'écran d'accueil Android : la date, The One Thing, les créneaux du jour, les rappels.
// Toucher le widget ouvre l'appli (et donc le pop-up « Ta journée » s'il n'a pas encore été vu).
// Composants de react-native-android-widget : rendus en vues Android natives, pas en React Native.
import React from 'react';
import { FlexWidget, ListWidget, TextWidget } from 'react-native-android-widget';
import { labelDayLong, labelDayShort } from '../calendar/dates';
import type { DayKey } from '../calendar/dates';
import { WidgetSnapshot, widgetToday } from './model';

// Palette de l'appli (src/theme.ts) : fond crème, bleu pétrole, sable doré.
const C = {
  bg: '#F7F3E8', card: '#FFFFFF', ink: '#1B2A2F', muted: '#6B7178', faint: '#A3A7AB',
  accent: '#14606E', accentDark: '#0C4450', sand: '#C8A25A', sandSoft: '#F3E8CE', warnDark: '#9A4A12', line: '#E6E1D6',
} as const;

type Hex = `#${string}`;

export function DayWidget({ snap, today }: { snap: WidgetSnapshot | null; today: DayKey }) {
  const { lines, rappels, oneThing, stale } = widgetToday(snap, today);
  const allDay = lines.filter((l) => l.time === null);
  const timed = lines.filter((l) => l.time !== null);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="Ouvrir Cerveau Externe"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: C.bg, borderRadius: 22, padding: 14, flexDirection: 'column', flexGap: 8 }}
    >
      <FlexWidget clickAction="OPEN_APP" style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TextWidget text={labelDayLong(today)} style={{ fontSize: 16, fontWeight: 'bold', color: C.accentDark }} />
        <TextWidget text="Ma journée" style={{ fontSize: 12, color: C.sand, fontWeight: 'bold' }} />
      </FlexWidget>

      {oneThing ? (
        <FlexWidget clickAction="OPEN_APP" style={{ width: 'match_parent', backgroundColor: C.sandSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'column' }}>
          <TextWidget text="The One Thing" style={{ fontSize: 11, color: C.muted }} />
          <TextWidget text={oneThing} maxLines={1} truncate="END" style={{ fontSize: 14, fontWeight: 'bold', color: C.ink }} />
        </FlexWidget>
      ) : null}

      <ListWidget style={{ width: 'match_parent', height: 'match_parent' }}>
        {stale ? (
          <FlexWidget clickAction="OPEN_APP" style={{ width: 'match_parent', paddingVertical: 6 }}>
            <TextWidget text="Ouvre l’appli pour mettre ta journée à jour." style={{ fontSize: 14, color: C.muted }} />
          </FlexWidget>
        ) : null}
        {!stale && !lines.length && !rappels.length ? (
          <FlexWidget clickAction="OPEN_APP" style={{ width: 'match_parent', paddingVertical: 6 }}>
            <TextWidget text="Rien de prévu aujourd’hui." style={{ fontSize: 14, color: C.muted }} />
          </FlexWidget>
        ) : null}
        {allDay.map((l, i) => (
          <FlexWidget key={`a${i}`} clickAction="OPEN_APP" style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 8, paddingVertical: 4 }}>
            <FlexWidget style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: l.color as Hex }} />
            <TextWidget text={l.title} maxLines={1} truncate="END" style={{ fontSize: 14, color: C.ink }} />
          </FlexWidget>
        ))}
        {timed.map((l, i) => (
          <FlexWidget key={`t${i}`} clickAction="OPEN_APP" style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 8, paddingVertical: 4 }}>
            <TextWidget text={l.time ?? ''} style={{ fontSize: 14, fontWeight: 'bold', color: l.done ? C.faint : C.ink, width: 46 }} />
            <FlexWidget style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: l.color as Hex }} />
            <TextWidget text={l.done ? `✓ ${l.title}` : l.title} maxLines={1} truncate="END" style={{ fontSize: 14, color: l.done ? C.faint : C.ink }} />
          </FlexWidget>
        ))}
        {rappels.map((r, i) => (
          <FlexWidget key={`r${i}`} clickAction="OPEN_APP" style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 8, paddingVertical: 4 }}>
            <TextWidget text="🔔" style={{ fontSize: 13 }} />
            <TextWidget
              text={r.butoir ? `${r.title} · avant le ${labelDayShort(r.butoir)}` : r.title}
              maxLines={1}
              truncate="END"
              style={{ fontSize: 14, color: C.warnDark, fontWeight: 'bold' }}
            />
          </FlexWidget>
        ))}
      </ListWidget>
    </FlexWidget>
  );
}
