// Page d'accueil à deux niveaux : 3 grosses catégories ; un clic ouvre un sous-menu avec les modules de la catégorie.
// Ajouter une catégorie ou un module = une entrée dans CATEGORIES / MODULES (modules.ts) ; les grilles s'adaptent au nombre.
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Icon, IconName, Txt } from '../ui';
import {
  CategoryId, CATEGORIES, categoryById, categoryInfo, categoryModules, directModule, ModuleId, tileSpan, TileInfo,
} from './modules';
import { useUpdate } from '../update/useUpdate';

export type { TileInfo };

// Version web (iPhone, 12 nov.) : pas de réveil ni de rappels dans un navigateur ; on le dit plutôt que de montrer un module muet.
const isWeb = Platform.OS === 'web';
const HOME_CATEGORIES = isWeb ? CATEGORIES.filter((c) => c.id !== 'reveil') : CATEGORIES;

function WebNotice() {
  return (
    <View style={st.notice}>
      <Icon name="info" size={20} color={colors.amber} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt bold size={14}>Version web (bêta)</Txt>
        <Txt size={13} color={colors.muted}>
          Pas de rappels ni de réveil ici. Tes données restent dans ce navigateur, sur ce téléphone : ajoute la page à ton
          écran d'accueil (Partager › Sur l'écran d'accueil) et ouvre l'appli depuis cette icône pour ne pas les perdre.
        </Txt>
      </View>
    </View>
  );
}

// Nouvelle version de l'appli (13 nov.) : bandeau en haut de l'accueil, le bouton télécharge directement l'APK.
function UpdateBanner() {
  const { available, install, later } = useUpdate();
  if (available == null) return null;
  return (
    <View style={st.update} accessibilityRole="alert">
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Icon name="download" size={22} color={colors.accentDark} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt bold size={16} color={colors.accentDark}>Nouvelle version disponible</Txt>
          <Txt size={13} color={colors.accentDark}>Tes données sont gardées. Touche « Installer » une fois le téléchargement fini.</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" onPress={later} hitSlop={6} style={({ pressed }) => [st.updateLater, pressed && { opacity: 0.6 }]}>
          <Txt size={14} color={colors.accentDark}>Plus tard</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={install} style={({ pressed }) => [st.updateBtn, pressed && { opacity: 0.8 }]}>
          <Txt bold size={15} color="#FFFFFF">Mettre à jour</Txt>
        </Pressable>
      </View>
    </View>
  );
}

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
  return info?.badge ? `${label}, ${info.badge} à trier` : info?.dot ? `${label}, à remplir` : label;
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
                    <Txt size={13} color={colors.muted}>{info[m.id]?.hint ?? m.hint}</Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={st.list}>
            <UpdateBanner />
            {HOME_CATEGORIES.map((c) => {
              const extra = categoryInfo(c.id, info);
              const direct = directModule(c.id);
              const hint = (direct && info[direct]?.hint) || c.hint;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={describe(c.label, extra)}
                  onPress={() => (direct ? onOpen(direct) : onMenu(c.id))}
                  style={({ pressed }) => [st.tile, st.category, pressed && { opacity: 0.7 }]}
                >
                  <View style={st.iconWrapBig}>
                    <Icon name={c.icon as IconName} size={30} color={colors.accent} />
                    <Badges info={extra} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt bold size={19}>{c.label}</Txt>
                    <Txt size={14} color={colors.muted}>{hint}</Txt>
                  </View>
                  <Icon name="chevron-right" size={22} color={colors.faint} />
                </Pressable>
              );
            })}
            {isWeb ? <WebNotice /> : null}
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
  notice: {
    flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.l, backgroundColor: colors.sandSoft, marginTop: 6,
  },
  update: { backgroundColor: colors.sand, borderRadius: radius.l, padding: 16, gap: 12 },
  updateBtn: { backgroundColor: colors.accentDark, borderRadius: radius.m, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center' },
  updateLater: { paddingHorizontal: 10, minHeight: 44, justifyContent: 'center' },
  dot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.alert, borderWidth: 2, borderColor: colors.card },
});
