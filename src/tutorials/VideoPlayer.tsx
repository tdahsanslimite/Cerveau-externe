// Lecteur de la vidéo tuto DANS l'appli (pas d'aller-retour vers YouTube : pour un TDAH, ouvrir YouTube = risque de s'y
// perdre). Lien YouTube = lecteur intégré qui démarre tout seul ; autre lien = rien ici (bouton « Ouvrir la vidéo »).
// Version web : VideoPlayer.web.tsx.
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radius } from '../theme';

/** Page minuscule qui contient le lecteur YouTube. Une vraie adresse d'origine évite le refus du lecteur dans une WebView. */
const ORIGIN = 'https://cerveau-externe.app';
const html = (id: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head><body>
<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(ORIGIN)}"
 allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
</body></html>`;

/** Vertical (9:16) : aussi haut que possible sans pousser les boutons hors de l'écran (62 % de la hauteur), centré. */
export function VideoPlayer({ youtubeId, vertical }: { youtubeId: string; vertical?: boolean }) {
  const { height } = useWindowDimensions();
  const h = Math.round(height * 0.62);
  const size = vertical ? { height: h, width: Math.round((h * 9) / 16), alignSelf: 'center' as const } : { width: '100%' as const, aspectRatio: 16 / 9 };
  return (
    <View style={[st.frame, size]}>
      <WebView
        source={{ html: html(youtubeId), baseUrl: ORIGIN }}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        style={{ backgroundColor: '#000' }}
      />
    </View>
  );
}

const st = StyleSheet.create({
  frame: { maxWidth: '100%', borderRadius: radius.m, overflow: 'hidden', backgroundColor: colors.ink },
});
