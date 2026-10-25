// Écran Méditation : pour l'instant une page d'attente. Les méditations guidées demandent des fichiers audio
// (à choisir et à enregistrer) : on les ajoutera ici quand le contenu existera.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Card, Icon, Txt } from '../ui';

export function MeditationScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <View style={st.content}>
        <Txt size={13} color={colors.muted} style={st.eyebrow}>Apaiser</Txt>
        <Txt bold size={28}>Méditation</Txt>
        <Card style={st.card}>
          <View style={st.badge}>
            <Icon name="moon" size={28} color={colors.accent} />
          </View>
          <Txt bold size={18}>Bientôt ici</Txt>
          <Txt size={15} color={colors.muted} style={{ textAlign: 'center' }}>
            Les méditations guidées arrivent : de courtes séances audio pour se poser quelques minutes.
            En attendant, la respiration est déjà disponible.
          </Txt>
        </Card>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, gap: 14 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { padding: 24, gap: 12, alignItems: 'center', marginTop: 12 },
  badge: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
