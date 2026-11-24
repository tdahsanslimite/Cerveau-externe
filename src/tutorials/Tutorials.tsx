// Tutoriels : fenêtre vidéo, bouton (?) en haut à droite des modules, ouverture automatique à la première visite.
// Le registre des vidéos est dans registry.ts. Réglage « Boutons tutoriel » dans Réglages (calendrier / Programmer).
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { colors } from '../theme';
import { Button, IconButton, Sheet, Txt } from '../ui';
import { moduleById, ModuleId } from '../home/modules';
import { useSettings } from '../settings/SettingsContext';
import { hasVideo, isVertical, shouldAutoOpen, TUTORIALS, youtubeId } from './registry';
import { VideoPlayer } from './VideoPlayer';

const Ctx = createContext<(id: ModuleId) => void>(() => undefined);
const OpenCtx = createContext(false);

/** Vrai quand la fenêtre tuto est ouverte : les autres fenêtres (ménage de la veille) attendent qu'elle soit fermée. */
export function useTutorialOpen(): boolean {
  return useContext(OpenCtx);
}

/** À poser une fois autour de l'appli : garde la fenêtre tuto et l'ouvre seule à la première visite d'un module. */
// `paused` : une autre fenêtre est ouverte (« Ta journée ») ; l'ouverture automatique attend qu'elle soit fermée
// (jamais deux fenêtres l'une sur l'autre).
export function TutorialProvider({ active, paused, children }: { active: ModuleId | null; paused?: boolean; children: ReactNode }) {
  const { settings, loaded, update } = useSettings();
  const [open, setOpen] = useState<ModuleId | null>(null);

  useEffect(() => {
    if (!loaded || !active || paused) return;
    if (shouldAutoOpen(TUTORIALS[active], active, settings.tutorialsSeen, settings.hideTutorials)) {
      setOpen(active);
      update({ tutorialsSeen: [...(settings.tutorialsSeen ?? []), active] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, loaded, paused]);

  return (
    <Ctx.Provider value={setOpen}>
      <OpenCtx.Provider value={open !== null}>
        {children}
        <TutorialSheet id={open} onClose={() => setOpen(null)} />
      </OpenCtx.Provider>
    </Ctx.Provider>
  );
}

/** Bouton (?) « Revoir le tutoriel », en haut à droite d'un module. Masqué si l'utilisateur a retiré les tutos. */
export function TutorialButton({ id }: { id: ModuleId }) {
  const openTutorial = useContext(Ctx);
  const { settings } = useSettings();
  if (settings.hideTutorials) return null;
  return <IconButton icon="help-circle" label="Revoir le tutoriel" onPress={() => openTutorial(id)} />;
}

function TutorialSheet({ id, onClose }: { id: ModuleId | null; onClose: () => void }) {
  const { update } = useSettings();
  const t = id ? TUTORIALS[id] : null;
  const yt = t && hasVideo(t) ? youtubeId(t.url) : null;
  return (
    <Sheet
      visible={id !== null}
      onClose={onClose}
      title={id ? `Tuto : ${moduleById(id).label}` : ''}
      footer={
        <>
          <Button label="C'est compris" icon="check" onPress={onClose} />
          <Button
            kind="ghost"
            label="Masquer les boutons tuto"
            onPress={() => { update({ hideTutorials: true }); onClose(); }}
          />
        </>
      }
    >
      {t ? (
        <View style={{ gap: 12 }}>
          {/* Le lecteur n'est monté que fenêtre ouverte : fermer la fenêtre arrête la vidéo. */}
          {yt ? <VideoPlayer youtubeId={yt} vertical={isVertical(t)} /> : null}
          {t && hasVideo(t) ? (
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(t.url).catch(() => undefined)} hitSlop={6}>
              <Txt size={13} color={colors.accent}>{yt ? 'La vidéo ne se lance pas ? Ouvrir dans YouTube' : 'Ouvrir la vidéo'}</Txt>
            </Pressable>
          ) : (
            <Txt size={13} color={colors.faint}>La vidéo arrive bientôt.</Txt>
          )}
          {t.summary ? <Txt size={15} style={{ lineHeight: 22 }}>{t.summary}</Txt> : null}
          <Txt size={12} color={colors.faint}>Tu peux remettre les boutons tuto dans Réglages (Calendrier ou Programmer).</Txt>
        </View>
      ) : null}
    </Sheet>
  );
}
