// Réglages › Planning du travail (BAM) : connecter son compte du site Planning BAM (24 nov., demande de Valentin).
// Une fois connecté, l'appli lit le planning elle-même depuis le téléphone (plus besoin d'ordinateur), range les
// créneaux dans Travail et les recopie dans l'agenda Google choisi pour bloquer Calendly.
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { colors, fonts, radius } from '../theme';
import { Button, Icon, Txt } from '../ui';

const time = (ms: number | null) => (ms ? new Date(ms).toTimeString().slice(0, 5) : '');

export function BamSettings() {
  const { bam } = useCalendar();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (bam.status === 'unsupported') {
    return (
      <View style={st.group}>
        <Txt size={13} color={colors.muted} style={st.pad}>Disponible uniquement dans l'appli installée sur le téléphone.</Txt>
      </View>
    );
  }

  if (!bam.email) {
    const connect = async () => {
      if (!email.trim() || !password) return setErr('Email et mot de passe BAM requis.');
      setBusy(true);
      setErr(null);
      try {
        await bam.connect(email, password);
        setPassword('');
      } catch (e) {
        setErr(String((e as Error)?.message ?? e));
      } finally {
        setBusy(false);
      }
    };
    return (
      <View style={[st.group, st.pad, { gap: 10 }]}>
        <Txt size={13} color={colors.muted} style={{ lineHeight: 18 }}>
          Connecte ton compte du site Planning BAM : tes créneaux arrivent tout seuls dans Travail, même ordinateur éteint.
          Ton mot de passe reste chiffré sur ce téléphone.
        </Txt>
        <TextInput
          accessibilityLabel="Email BAM"
          placeholder="Email BAM"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          style={st.input}
        />
        <TextInput
          accessibilityLabel="Mot de passe BAM"
          placeholder="Mot de passe BAM"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          onSubmitEditing={() => void connect()}
          style={st.input}
        />
        {err ? <Txt size={14} color={colors.danger} selectable>{err}</Txt> : null}
        <Button label={busy ? 'Connexion…' : 'Connecter mon planning'} kind="dark" onPress={() => void connect()} />
      </View>
    );
  }

  return (
    <View style={st.group}>
      <View style={[st.pad, st.line, { gap: 4 }]}>
        <Txt bold>Connecté : {bam.email}</Txt>
        <Txt size={13} color={bam.status === 'error' ? colors.danger : colors.muted} selectable>
          {bam.status === 'loading'
            ? 'Lecture du planning…'
            : bam.status === 'error'
              ? bam.error
              : `${bam.count} créneau${bam.count > 1 ? 'x' : ''} lu${bam.count > 1 ? 's' : ''}${bam.lastSync ? ` · à ${time(bam.lastSync)}` : ''}`}
        </Txt>
      </View>

      <View style={[st.pad, st.line, { gap: 6 }]}>
        <Txt bold size={14}>Recopier dans Google Agenda (bloque Calendly)</Txt>
        {bam.writableCalendars.length === 0 ? (
          <Txt size={13} color={colors.muted}>Active « Afficher mes agendas du téléphone » ci-dessus pour choisir un agenda Google.</Txt>
        ) : (
          <>
            {bam.writableCalendars.map((c) => {
              const on = bam.writeCalendar?.id === c.id;
              return (
                <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => bam.setWriteCalendar(c.id)} style={st.choice}>
                  <View style={[st.radio, { borderColor: c.color }, on && { backgroundColor: c.color }]}>
                    {on ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt size={15}>{c.title}</Txt>
                    {c.account && c.account !== c.title ? <Txt size={12} color={colors.muted}>{c.account}</Txt> : null}
                  </View>
                </Pressable>
              );
            })}
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: !bam.writeCalendar }} onPress={() => bam.setWriteCalendar('none')} style={st.choice}>
              <View style={[st.radio, { borderColor: colors.border }, !bam.writeCalendar && { backgroundColor: colors.ink }]}>
                {!bam.writeCalendar ? <Icon name="check" size={14} color="#FFFFFF" /> : null}
              </View>
              <Txt size={15}>Ne pas recopier</Txt>
            </Pressable>
          </>
        )}
        {bam.mirrorError ? <Txt size={13} color={colors.danger} selectable>{bam.mirrorError}</Txt> : null}
        {bam.lastMirror ? <Txt size={12} color={colors.muted}>Dernière recopie à {time(bam.lastMirror)}</Txt> : null}
      </View>

      <View style={[st.pad, { flexDirection: 'row', gap: 16, alignItems: 'center' }]}>
        <Pressable accessibilityRole="button" onPress={() => void bam.refresh()} hitSlop={8} style={{ flex: 1 }}>
          <Txt bold size={14} color={colors.accent}>Synchroniser</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void bam.disconnect()} hitSlop={8}>
          <Txt bold size={14} color={colors.danger}>Déconnecter</Txt>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  group: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  pad: { paddingHorizontal: 14, paddingVertical: 12 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  input: {
    minHeight: 48, borderRadius: radius.m, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16, color: colors.ink,
  },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
