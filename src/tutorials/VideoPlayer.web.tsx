// Version web du lecteur tuto : une simple iframe YouTube (react-native-webview ne fonctionne pas dans un navigateur).
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors, radius } from '../theme';

/** Vertical (9:16) : aussi haut que possible sans pousser les boutons hors de l'écran (62 % de la hauteur), centré. */
export function VideoPlayer({ youtubeId, vertical }: { youtubeId: string; vertical?: boolean }) {
  const { height } = useWindowDimensions();
  const h = Math.round(height * 0.62);
  const size = vertical ? { height: h, width: Math.round((h * 9) / 16), alignSelf: 'center' as const } : { width: '100%' as const, aspectRatio: 16 / 9 };
  return (
    <View style={[st.frame, size]}>
      {React.createElement('iframe', {
        src: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0`,
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        allowFullScreen: true,
        title: 'Tutoriel',
        style: { border: 0, width: '100%', height: '100%' },
      })}
    </View>
  );
}

const st = StyleSheet.create({
  frame: { maxWidth: '100%', borderRadius: radius.m, overflow: 'hidden', backgroundColor: colors.ink },
});
