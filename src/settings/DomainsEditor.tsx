// Réglages › Domaines : créer, renommer, recolorer, supprimer.
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { todayKey } from '../calendar/dates';
import { hoursLabel, periodRange } from '../calendar/HoursBilan';
import { Domain, DOMAIN_COLORS, hoursByDomain, newId } from '../calendar/model';
import { colors, fonts, radius, TOUCH } from '../theme';
import { Button, Icon, Txt } from '../ui';

export function DomainsEditor() {
  const { domains, events, saveDomain, deleteDomain } = useCalendar();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Domain | null>(null);
  const [confirm, setConfirm] = useState(false);

  const open = (d: Domain) => {
    setOpenId(d.id);
    setDraft(d);
    setConfirm(false);
  };
  const close = () => {
    setOpenId(null);
    setDraft(null);
    setConfirm(false);
  };
  const add = () => {
    const used = new Set(domains.map((d) => d.color));
    const d: Domain = { id: newId(), label: '', color: DOMAIN_COLORS.find((c) => !used.has(c)) ?? DOMAIN_COLORS[0] };
    setOpenId(d.id);
    setDraft(d);
    setConfirm(false);
  };
  const save = () => {
    if (!draft || !draft.label.trim()) return;
    saveDomain({ ...draft, label: draft.label.trim() });
    close();
  };

  const isNew = !!draft && !domains.some((d) => d.id === draft.id);
  const usage = (id: string) => events.filter((e) => e.category === id).length;
  const today = todayKey();
  const month = periodRange('mois', today);
  const monthMinutes = hoursByDomain(events, month.from, month.to, today);
  const fallback = domains.find((d) => d.id !== openId);

  const editor = draft ? (
    <View style={st.editor}>
      <TextInput
        accessibilityLabel="Nom du domaine"
        value={draft.label}
        onChangeText={(label) => setDraft({ ...draft, label })}
        placeholder="Ex. Immobilier, YouTube, Couple…"
        placeholderTextColor={colors.faint}
        autoFocus
        style={st.input}
      />
      <View style={st.swatches}>
        {DOMAIN_COLORS.map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityState={{ selected: draft.color === c }}
            accessibilityLabel={`Couleur ${c}`}
            onPress={() => setDraft({ ...draft, color: c })}
            style={[st.swatch, { backgroundColor: c }, draft.color === c && st.swatchOn]}
          >
            {draft.color === c ? <Icon name="check" size={18} color="#FFFFFF" /> : null}
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Annuler" kind="ghost" onPress={close} style={{ flex: 1 }} />
        <Button label={isNew ? 'Créer' : 'Enregistrer'} kind="dark" onPress={save} style={[{ flex: 1 }, !draft.label.trim() && { opacity: 0.45 }]} />
      </View>
      {!isNew && fallback ? (
        confirm ? (
          <View style={{ gap: 8 }}>
            <Txt size={14} color={colors.danger} style={{ lineHeight: 20 }}>
              {usage(draft.id)
                ? `${usage(draft.id)} événement(s) passeront dans « ${fallback.label} ».`
                : 'Aucun événement n’utilise ce domaine.'}
            </Txt>
            <Button label="Oui, supprimer ce domaine" kind="danger" onPress={() => { deleteDomain(draft.id, fallback.id); close(); }} />
          </View>
        ) : (
          <Button label="Supprimer ce domaine" kind="danger" icon="trash-2" onPress={() => setConfirm(true)} />
        )
      ) : null}
    </View>
  ) : null;

  return (
    <View style={st.group}>
      {domains.map((d) => (
        <View key={d.id}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Modifier le domaine ${d.label}`}
            onPress={() => (openId === d.id ? close() : open(d))}
            style={st.row}
          >
            <View style={[st.dot, { backgroundColor: openId === d.id && draft ? draft.color : d.color }]} />
            <Txt bold style={{ flex: 1 }}>{d.label}</Txt>
            <Txt size={13} color={colors.muted}>{monthMinutes[d.id]?.done ? `${hoursLabel(monthMinutes[d.id].done)} ce mois` : ''}</Txt>
            <Icon name={openId === d.id ? 'chevron-up' : 'edit-2'} size={16} color={colors.faint} />
          </Pressable>
          {openId === d.id ? editor : null}
        </View>
      ))}
      {isNew ? editor : (
        <Pressable accessibilityRole="button" onPress={add} style={[st.row, { borderBottomWidth: 0 }]}>
          <Icon name="plus" size={18} color={colors.accent} />
          <Txt bold color={colors.accent}>Nouveau domaine</Txt>
        </Pressable>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  group: { backgroundColor: colors.card, borderRadius: radius.l, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  dot: { width: 14, height: 14, borderRadius: 7 },
  editor: { padding: 14, gap: 12, backgroundColor: '#FAF9F6', borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  input: {
    minHeight: 48, borderRadius: radius.m, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 16, color: colors.ink,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: TOUCH, height: TOUCH, borderRadius: TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: colors.ink },
});
