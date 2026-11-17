// La page d'un thème : un zoom enchaîné (17 nov., Valentin).
//   Année  →  T1 T2 T3 T4  →  les 3 mois du trimestre choisi  →  les semaines du mois choisi.
// Chaque niveau est un bloc qui se déplie pour remplir sa fiche ; le niveau du dessus reste visible.
// On ne peut choisir qu'un mois du trimestre affiché et une semaine du mois affiché : pas de semaine « hors du mois ».
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { isoWeek, labelWeekRange, MONTHS, todayKey } from '../calendar/dates';
import { useJournal } from '../journal/JournalContext';
import { tone } from '../journal/DayEditor';
import { formatScore } from '../journal/model';
import { colors, radius } from '../theme';
import { Button, Card, Chip, Icon, IconButton, Txt } from '../ui';
import { useGoals } from './GoalsContext';
import { TextBlock } from './fields';
import {
  effectiveLeading, isFilled, monthShort, monthsOfQuarter, PERIOD_FIELDS, PeriodCard, THEME_FIELDS, themeIndicator, themeInfo,
  ThemeId, weeksOfMonth, Zoom, zoomKeys, zoomMonth, zoomQuarter, zoomToday, zoomYear,
} from './model';
import { periodKey } from './model';

export type Block = 'annee' | 'trimestre' | 'mois' | 'semaine';

const monthLong = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const hasContent = (c: PeriodCard | undefined) => !!c && Object.values(c).some(isFilled);

export function ThemeView({ theme, zoom, onZoom, open, onToggle, onBack }: {
  theme: ThemeId; zoom: Zoom; onZoom: (z: Zoom) => void;
  open: Set<Block>; onToggle: (b: Block) => void; onBack: () => void;
}) {
  const { years, themePeriods, chosen, themeText, periodText, lead } = useGoals();
  const { entries } = useJournal();
  const today = todayKey();
  const info = themeInfo(theme);
  const year = String(zoom.year);
  const card = years[year]?.themes[theme];
  const periods = themePeriods[theme] ?? {};
  const keys = zoomKeys(zoom);
  const now = zoomToday(today);
  const indicator = themeIndicator(entries, theme, today);
  const several = chosen.length > 1;
  const leading = effectiveLeading(years[year], chosen) === theme;

  const quarterKey = (q: number) => `T${zoom.year}-Q${q}`;
  const months = monthsOfQuarter(zoom.year, zoom.quarter);
  const weeks = weeksOfMonth(zoom.month);

  const periodBlock = (block: Exclude<Block, 'annee'>, key: string, title: string, subtitle: string) => {
    const c = periods[key];
    const isOpen = open.has(block);
    return (
      <Card style={[st.block, isOpen && st.blockOpen]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
          accessibilityLabel={`${title}, ${isOpen ? 'ouvert' : 'fermé'}`}
          onPress={() => onToggle(block)}
          style={st.blockHead}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Txt bold size={17}>{title}</Txt>
            <Txt size={13} color={colors.muted}>{subtitle}</Txt>
          </View>
          <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
        </Pressable>
        {!isOpen ? (
          c?.who ? <Txt size={15} numberOfLines={2} style={{ lineHeight: 22 }}>{c.who.trim()}</Txt>
            : <Txt size={14} color={colors.faint}>{hasContent(c) ? 'Fiche commencée. Touche pour la voir.' : 'Touche pour remplir.'}</Txt>
        ) : (
          PERIOD_FIELDS.map((f) => (
            <TextBlock
              key={`${theme}-${key}-${f.id}`}
              label={f.label}
              value={c?.[f.id] ?? ''}
              onChange={(t) => periodText(theme, key, f.id, t)}
              placeholder={f.placeholder}
              lines={f.lines}
            />
          ))
        )}
      </Card>
    );
  };

  const yearOpen = open.has('annee');

  return (
    <>
      <Pressable accessibilityRole="button" onPress={onBack} style={st.back} hitSlop={8}>
        <Icon name="chevron-left" size={20} color={colors.accent} />
        <Txt bold size={15} color={colors.accent}>Mes thèmes</Txt>
      </Pressable>

      <View style={st.themeHead}>
        <View style={st.iconWrap}><Icon name={info.icon} size={22} color={colors.accentDark} /></View>
        <View style={{ flex: 1 }}>
          <Txt bold size={22}>{info.label}</Txt>
          <Txt size={14} color={colors.muted}>{info.tagline}</Txt>
        </View>
      </View>

      {/* 1. Année */}
      <View style={st.yearRow}>
        <IconButton icon="chevron-left" label="Année précédente" onPress={() => onZoom(zoomYear(zoom.year - 1, today))} />
        <Txt bold size={20} style={{ flex: 1, textAlign: 'center' }}>{year}</Txt>
        <IconButton icon="chevron-right" label="Année suivante" onPress={() => onZoom(zoomYear(zoom.year + 1, today))} />
      </View>
      <Card style={[st.block, yearOpen && st.blockOpen]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: yearOpen }}
          accessibilityLabel={`Objectifs de l’année ${year}, ${yearOpen ? 'ouvert' : 'fermé'}`}
          onPress={() => onToggle('annee')}
          style={st.blockHead}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Txt bold size={17}>{`Année ${year}`}</Txt>
            <Txt size={13} color={colors.muted}>Objectif, One Thing, identité…</Txt>
          </View>
          {leading && several ? <View style={st.badge}><Txt bold size={12} color="#FFFFFF">En tête</Txt></View> : null}
          <Icon name={yearOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
        </Pressable>
        {!yearOpen ? (
          card?.goal || card?.oneThing ? (
            <View style={{ gap: 6 }}>
              {card.goal ? <Txt size={15} numberOfLines={2} style={{ lineHeight: 22 }}>{card.goal.trim()}</Txt> : null}
              {card.oneThing ? (
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                  <Icon name="star" size={15} color={colors.accentDark} />
                  <Txt bold size={14} numberOfLines={2} style={{ flex: 1 }}>{card.oneThing.trim()}</Txt>
                </View>
              ) : null}
            </View>
          ) : <Txt size={14} color={colors.faint}>Touche pour écrire ton objectif de l’année.</Txt>
        ) : (
          <>
            {indicator ? (
              <View style={{ gap: 8 }}>
                <Txt bold size={14}>{`Indicateur : ${indicator.label}`}</Txt>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Avg label="7 derniers jours" value={indicator.avg7} />
                  <Avg label="30 derniers jours" value={indicator.avg30} />
                </View>
                <Txt size={12} color={colors.faint}>Moyenne de ta note du Journal, sur 10. Rien à saisir ici.</Txt>
              </View>
            ) : null}
            {several ? (
              <Button
                label={leading ? 'Retirer de la tête' : 'Mettre ce thème en tête'}
                icon="star"
                kind={leading ? 'ghost' : 'primary'}
                onPress={() => lead(year, theme)}
              />
            ) : null}
            {THEME_FIELDS.map((f) => (
              <TextBlock
                key={`${theme}-${year}-${f.id}`}
                label={f.label}
                hint={f.hint}
                value={card?.[f.id] ?? ''}
                onChange={(t) => themeText(year, theme, f.id, t)}
                placeholder={f.placeholder}
                lines={f.lines}
              />
            ))}
          </>
        )}
      </Card>

      {/* 2. Trimestre */}
      <Level label="Trimestre">
        {[1, 2, 3, 4].map((q) => (
          <Chip
            key={q}
            label={`T${q}`}
            selected={zoom.quarter === q}
            dot={zoom.quarter !== q && hasContent(periods[quarterKey(q)]) ? colors.accent : undefined}
            onPress={() => onZoom(zoomQuarter(zoom.year, q, today))}
          />
        ))}
      </Level>
      {periodBlock('trimestre', keys.trimestre, `Trimestre ${zoom.quarter}${now.year === zoom.year && now.quarter === zoom.quarter ? ' · en cours' : ''}`,
        `${cap(monthShort(months[0]))} → ${monthShort(months[2])} ${zoom.year}`)}

      {/* 3. Mois du trimestre */}
      <Level label="Mois">
        {months.map((m) => (
          <Chip
            key={m}
            label={cap(monthShort(m))}
            selected={zoom.month === m}
            dot={zoom.month !== m && hasContent(periods[`M${m}`]) ? colors.accent : undefined}
            onPress={() => onZoom(zoomMonth(m, today))}
          />
        ))}
      </Level>
      {periodBlock('mois', keys.mois, `${cap(monthLong(zoom.month))}${now.month === zoom.month ? ' · en cours' : ''}`,
        `Dans le trimestre ${zoom.quarter}`)}

      {/* 4. Semaines du mois */}
      <Level label="Semaine">
        {weeks.map((w) => (
          <Chip
            key={w}
            label={`S${isoWeek(w)}`}
            selected={zoom.week === w}
            dot={zoom.week !== w && hasContent(periods[periodKey('semaine', w)]) ? colors.accent : undefined}
            onPress={() => onZoom({ ...zoom, week: w })}
          />
        ))}
      </Level>
      {periodBlock('semaine', keys.semaine, `Semaine ${isoWeek(zoom.week)}${now.week === zoom.week ? ' · en cours' : ''}`,
        `${labelWeekRange(zoom.week)} · dans ${monthLong(zoom.month)}`)}

      {(zoom.week !== now.week) ? (
        <Pressable accessibilityRole="button" onPress={() => onZoom(now)} style={st.todayBtn}>
          <Txt bold size={14} color={colors.accent}>Revenir aux périodes en cours</Txt>
        </Pressable>
      ) : null}
      <Txt size={12} color={colors.faint} style={{ paddingHorizontal: 4 }}>
        Une semaine compte dans le mois où tombe son jeudi. Enregistré automatiquement, uniquement sur ce téléphone.
      </Txt>
    </>
  );
}

function Level({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      <Txt size={13} color={colors.muted} style={{ paddingHorizontal: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Txt>
      <View style={st.chips}>{children}</View>
    </View>
  );
}

function Avg({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={st.avg}>
      <Txt size={12} color={colors.muted}>{label}</Txt>
      <Txt bold size={26} color={value === null ? colors.faint : tone(Math.round(value))}>
        {value === null ? '–' : formatScore(value)}
      </Txt>
    </View>
  );
}

const st = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  themeHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  block: { padding: 16, gap: 14 },
  blockOpen: { borderColor: colors.accent, borderWidth: 2 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  avg: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.m, padding: 10, gap: 2 },
  todayBtn: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
