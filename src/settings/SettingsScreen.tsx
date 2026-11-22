// Paramètres : TOUS les réglages de l'appli en une seule page (22 nov., demande de Valentin), ouverte par le bouton
// « Paramètres » en bas de l'accueil. Une partie par module, avec son nom en titre, dans l'ordre de l'accueil ;
// « Général » d'abord. Les blocs sont ceux des pastilles des modules (SettingsSheet.tsx) : un réglage n'existe qu'une fois.
import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, moduleById, ModuleId } from '../home/modules';
import { colors } from '../theme';
import { Icon, IconButton, IconName, Txt, useDeviceBottomInset } from '../ui';
import { GeneralSection, MODULE_SETTINGS } from './SettingsSheet';

/** Modules qui ont des réglages, dans l'ordre de l'accueil (catégorie par catégorie). */
const ORDER: ModuleId[] = CATEGORIES.flatMap((c) => c.items).filter((id) => !!MODULE_SETTINGS[id]);

function Part({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <View style={st.part}>
      <View style={st.partHead} accessibilityRole="header">
        <View style={st.partIcon}><Icon name={icon} size={20} color={colors.accent} /></View>
        <Txt bold size={22}>{title}</Txt>
      </View>
      {children}
    </View>
  );
}

export function SettingsScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const bottom = useDeviceBottomInset();
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[st.root, { paddingTop: insets.top }]}>
        <View style={st.head}>
          <Txt bold size={28} style={{ flex: 1 }}>Paramètres</Txt>
          <IconButton icon="x" label="Fermer" onPress={onClose} bordered={false} />
        </View>
        <ScrollView contentContainerStyle={[st.content, { paddingBottom: bottom + 40 }]} keyboardShouldPersistTaps="handled">
          <Part icon="sliders" title="Général">
            <GeneralSection />
          </Part>
          {ORDER.map((id) => {
            const m = moduleById(id);
            return (
              <Part key={id} icon={m.icon as IconName} title={m.label}>
                {MODULE_SETTINGS[id]!()}
              </Part>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8 },
  content: { paddingHorizontal: 18, gap: 28, maxWidth: 640, width: '100%', alignSelf: 'center' },
  part: { gap: 14 },
  partHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: colors.sand },
  partIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
