// Écran Respiration : un cercle qui grossit à l'inspiration et rétrécit à l'expiration, avec le temps restant.
// Rien n'est enregistré ; l'exercice s'arrête quand on quitte l'écran (il n'est monté que lorsqu'il est affiché).
import React, { useEffect, useRef, useState } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Pressable, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Button, Card, Chip, Txt } from '../ui';
import { DURATIONS_MIN, EXERCISES, formatClock, phaseAt, scaleAt } from './model';

const PING_START = require('../../assets/sounds/ping-depart.wav');
const PING_PHASE = require('../../assets/sounds/ping-temps.wav');

const CIRCLE = 240;
const MIN_SCALE = 0.45;

export function BreathingScreen() {
  const insets = useSafeAreaInsets();
  const [exerciseId, setExerciseId] = useState(EXERCISES[0].id);
  const exercise = EXERCISES.find((e) => e.id === exerciseId) ?? EXERCISES[0];
  const [minutes, setMinutes] = useState(exercise.defaultMinutes);
  const [vibrate, setVibrate] = useState(true);
  const [sound, setSound] = useState(true);
  const pingStart = useAudioPlayer(PING_START);
  const pingPhase = useAudioPlayer(PING_PHASE);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const lastIndex = useRef(-1);
  const total = minutes * 60;

  // Les pings se jouent même en mode silencieux et sans couper la musique en cours.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  const ping = (player: typeof pingStart) => {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Le son est un confort : s'il échoue, l'exercice continue.
    }
  };

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const tick = () => {
      const t = (Date.now() - startedAt.current) / 1000;
      if (t >= total) {
        setElapsed(total);
        setRunning(false);
        setDone(true);
        if (vibrate) Vibration.vibrate(300);
        return;
      }
      const s = phaseAt(exercise, t);
      const key = s.cycle * 10 + s.index;
      if (key !== lastIndex.current) {
        const first = lastIndex.current === -1;
        lastIndex.current = key;
        if (vibrate) Vibration.vibrate(40);
        // Premier temps : le ping de départ a déjà sonné au clic sur « Commencer ».
        if (sound && !first) ping(pingPhase);
      }
      setElapsed(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, exercise, total, vibrate, sound]);

  useEffect(() => () => Vibration.cancel(), []);

  const start = () => {
    startedAt.current = Date.now();
    lastIndex.current = -1;
    setElapsed(0);
    setDone(false);
    setRunning(true);
    if (sound) ping(pingStart);
  };
  const stop = () => {
    setRunning(false);
    setElapsed(0);
    Vibration.cancel();
  };
  const pick = (id: string) => {
    const ex = EXERCISES.find((e) => e.id === id);
    if (!ex) return;
    setExerciseId(id);
    setMinutes(ex.defaultMinutes);
    setDone(false);
  };

  const state = phaseAt(exercise, elapsed);
  const scale = MIN_SCALE + (1 - MIN_SCALE) * (running ? scaleAt(exercise, elapsed) : 0);
  const label = running ? state.phase.name : done ? 'Bravo' : 'Prêt ?';

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        <Txt size={13} color={colors.muted} style={st.eyebrow}>Apaiser</Txt>
        <Txt bold size={28}>Respiration</Txt>

        <View style={st.stage}>
          <View
            style={[st.circle, { transform: [{ scale }] }]}
            accessibilityLabel={running ? `${state.phase.name}, encore ${state.remaining} secondes` : label}
            accessibilityLiveRegion="polite"
          />
          <View style={st.stageText} pointerEvents="none">
            <Txt bold size={26} color="#FFFFFF">{label}</Txt>
            {running ? <Txt size={20} color="#FFFFFF">{state.remaining}</Txt> : null}
          </View>
        </View>

        <View style={{ alignItems: 'center', minHeight: 24 }}>
          {running ? <Txt size={15} color={colors.muted}>Reste {formatClock(total - elapsed)}</Txt> : null}
          {done ? <Txt size={15} color={colors.muted}>{minutes} min de respiration. Prends un instant avant de reprendre.</Txt> : null}
        </View>

        {running ? (
          <Button label="Arrêter" kind="ghost" icon="square" onPress={stop} />
        ) : (
          <Button label={done ? 'Recommencer' : 'Commencer'} icon="play" onPress={start} />
        )}

        {!running ? (
          <>
            <Card style={{ padding: 16, gap: 12 }}>
              <Txt bold size={16}>Exercice</Txt>
              <View style={st.chips}>
                {EXERCISES.map((e) => (
                  <Chip key={e.id} label={e.label} selected={e.id === exerciseId} onPress={() => pick(e.id)} />
                ))}
              </View>
              <Txt size={14} color={colors.muted}>{exercise.description}</Txt>
            </Card>

            <Card style={{ padding: 16, gap: 12 }}>
              <Txt bold size={16}>Durée</Txt>
              <View style={st.chips}>
                {DURATIONS_MIN.map((m) => (
                  <Chip key={m} label={`${m} min`} selected={m === minutes} onPress={() => { setMinutes(m); setDone(false); }} />
                ))}
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: vibrate }}
                onPress={() => setVibrate((v) => !v)}
                style={({ pressed }) => [st.switchRow, pressed && { opacity: 0.6 }]}
              >
                <Txt size={15} style={{ flex: 1 }}>Vibration à chaque temps</Txt>
                <View style={[st.track, vibrate && { backgroundColor: colors.accent }]}>
                  <View style={[st.thumb, vibrate && { alignSelf: 'flex-end' }]} />
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: sound }}
                onPress={() => setSound((v) => !v)}
                style={({ pressed }) => [st.switchRow, pressed && { opacity: 0.6 }]}
              >
                <Txt size={15} style={{ flex: 1 }}>Ping au départ et à chaque temps</Txt>
                <View style={[st.track, sound && { backgroundColor: colors.accent }]}>
                  <View style={[st.thumb, sound && { alignSelf: 'flex-end' }]} />
                </View>
              </Pressable>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, gap: 14, paddingBottom: 40 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.5 },
  stage: { height: CIRCLE + 20, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, backgroundColor: colors.accent, borderWidth: 6, borderColor: colors.sand },
  stageText: { position: 'absolute', alignItems: 'center', gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 12 },
  track: { width: 48, height: 28, borderRadius: radius.pill, backgroundColor: colors.border, padding: 3, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignSelf: 'flex-start' },
});
