// Version web du lecteur tuto : une simple iframe YouTube (react-native-webview ne fonctionne pas dans un navigateur).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

export function VideoPlayer({ youtubeId }: { youtubeId: string }) {
  return (
    <View style={st.frame}>
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
  frame: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.m, overflow: 'hidden', backgroundColor: colors.ink },
});
