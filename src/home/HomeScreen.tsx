// Page d'accueil à deux niveaux : 3 grosses catégories ; un clic ouvre un sous-menu avec les modules de la catégorie.
// Ajouter une catégorie ou un module = une entrée dans CATEGORIES / MODULES (modules.ts) ; les grilles s'adaptent au nombre.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Icon, IconName, Txt } from '../ui';
import {
  CategoryId, CATEGORIES, categoryById, categoryInfo, categoryModules, ModuleId, tileSpan, TileInfo,
} from './modules';

export type { TileInfo };

function Badges({ info }: { info?: TileInfo }) {
  return (
    <>
      {info?.badge ? (
        <View style={st.badge}>
          <Txt bold size={11} color="#FFFFFF">{info.badge > 99 ? '99+' : info.badge}</Txt>
        </View>
      ) : null}
      {info?.dot ? <View style={st.dot} /> : null}
    </>
  );
}

function describe(label: string, info?: TileInfo): string {
  return info?.badge ? `${label}, ${info.badge} à classer` : info?.dot ? `${label}, à remplir` : label;
}

export function HomeScreen({ menu, onMenu, onOpen, info }: {
  /** Catégorie dont le sous-menu est ouvert, ou null pour l'accueil. */
  menu: CategoryId | null;
  onMenu: (id: CategoryId | null) => void;
  onOpen: (id: ModuleId) => void;
  info: Partial<Record<ModuleId, TileInfo>>;
}) {
  const insets = useSafeAreaInsets();
  const category = menu ? categoryById(menu) : null;
  const modules = menu ? categoryModules(menu) : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[st.hero, { paddingTop: insets.top + 24 }]}>
          {category ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retour à l'accueil"
              onPress={() => onMenu(null)}
              hitSlop={8}
              style={({ pressed }) => [st.back, pressed && { opacity: 0.6 }]}
            >
              <Icon name="arrow-left" size={20} color={colors.sand} />
              <Txt size={14} color={colors.sand}>Accueil</Txt>
            </Pressable>
          ) : (
            <Txt size={13} color={colors.sand} style={st.eyebrow}>Cerveau externe</Txt>
          )}
          <Txt bold size={30} color="#FFFFFF">{category ? category.label : 'Par où veux-tu commencer ?'}</Txt>
          <View style={st.rule} />
        </View>

        {category ? (
          <View style={st.grid}>
            {modules.map((m, i) => {
              const span = tileSpan(i, modules.length);
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityLabel={describe(m.label, info[m.id])}
                  onPress={() => onOpen(m.id)}
                  style={({ pressed }) => [st.tile, span === 2 ? st.tileWide : st.tileHalf, pressed && { opacity: 0.7 }]}
                >
                  <View style={st.iconWrap}>
                    <Icon name={m.icon as IconName} size={26} color={colors.accent} />
                    <Badges info={info[m.id]} />
                  </View>
                  <View style={{ gap: 2, flexShrink: 1 }}>
                    <Txt bold size={17}>{m.label}</Txt>
                    <Txt size={13} color={colors.muted}>{m.hint}</Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={st.list}>
            {CATEGORIES.map((c) => {
              const extra = categoryInfo(c.id, info);
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={describe(c.label, extra)}
                  onPress={() => onMenu(c.id)}
                  style={({ pressed }) => [st.tile, st.category, pressed && { opacity: 0.7 }]}
                >
                  <View style={st.iconWrapBig}>
                    <Icon name={c.icon as IconName} size={30} color={colors.accent} />
                    <Badges info={extra} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt bold size={19}>{c.label}</Txt>
                    <Txt size={14} color={colors.muted}>{c.hint}</Txt>
                  </View>
                  <Icon name="chevron-right" size={22} color={colors.faint} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  hero: {
    backgroundColor: colors.accentDark, paddingHorizontal: 22, paddingBottom: 34, gap: 8,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
  rule: { width: 48, height: 4, borderRadius: 2, backgroundColor: colors.sand, marginTop: 8 },
  list: { gap: 14, paddingHorizontal: 16, paddingTop: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingHorizontal: 16, paddingTop: 22 },
  tile: {
    backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line,
    padding: 16, gap: 14, minHeight: 132, justifyContent: 'flex-start',
  },
  category: { flexDirection: 'row', alignItems: 'center', minHeight: 112, gap: 16 },
  tileHalf: { width: '48.5%' },
  tileWide: { width: '100%', flexDirection: 'row', alignItems: 'center', minHeight: 96, gap: 16 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  iconWrapBig: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: colors.warn, alignItems: 'center', justifyContent: 'center',
  },
  dot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.alert, borderWidth: 2, borderColor: colors.card },
});
