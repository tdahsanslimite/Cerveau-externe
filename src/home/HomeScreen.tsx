// Page d'accueil : un bandeau bleu pétrole et une grille de grosses tuiles, une par module.
// Ajouter un module = une ligne dans MODULES (modules.ts) ; la grille s'adapte à n'importe quel nombre de tuiles.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Icon, IconName, Txt } from '../ui';
import { ModuleId, MODULES, tileSpan } from './modules';

export type TileInfo = { badge?: number; dot?: boolean };

export function HomeScreen({ onOpen, info }: { onOpen: (id: ModuleId) => void; info: Partial<Record<ModuleId, TileInfo>> }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={[st.hero, { paddingTop: insets.top + 24 }]}>
          <Txt size={13} color={colors.sand} style={st.eyebrow}>Cerveau externe</Txt>
          <Txt bold size={30} color="#FFFFFF">Par où veux-tu commencer ?</Txt>
          <View style={st.rule} />
        </View>

        <View style={st.grid}>
          {MODULES.map((m, i) => {
            const extra = info[m.id];
            const span = tileSpan(i, MODULES.length);
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={
                  extra?.badge ? `${m.label}, ${extra.badge} à classer` : extra?.dot ? `${m.label}, à remplir` : m.label
                }
                onPress={() => onOpen(m.id)}
                style={({ pressed }) => [
                  st.tile,
                  span === 2 ? st.tileWide : st.tileHalf,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={st.iconWrap}>
                  <Icon name={m.icon as IconName} size={26} color={colors.accent} />
                  {extra?.badge ? (
                    <View style={st.badge}>
                      <Txt bold size={11} color="#FFFFFF">{extra.badge > 99 ? '99+' : extra.badge}</Txt>
                    </View>
                  ) : null}
                  {extra?.dot ? <View style={st.dot} /> : null}
                </View>
                <View style={{ gap: 2 }}>
                  <Txt bold size={17}>{m.label}</Txt>
                  <Txt size={13} color={colors.muted}>{m.hint}</Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
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
  rule: { width: 48, height: 4, borderRadius: 2, backgroundColor: colors.sand, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, paddingHorizontal: 16, paddingTop: 22 },
  tile: {
    backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line,
    padding: 16, gap: 14, minHeight: 132, justifyContent: 'flex-start',
  },
  tileHalf: { width: '48.5%' },
  tileWide: { width: '100%', flexDirection: 'row', alignItems: 'center', minHeight: 96, gap: 16 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: colors.warn, alignItems: 'center', justifyContent: 'center',
  },
  dot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.alert, borderWidth: 2, borderColor: colors.card },
});
