// « Programmer » (13 nov., parcours de Valentin) : une seule porte d'entrée pour tout ce qui va dans l'appli.
// 1) le titre (noté en haut de l'écran), 2) le type : Rendez-vous, Événement, Tâche ou Idée,
// 3) le contenu : encart libre ou check-liste, 4) la priorité :
//    - rendez-vous / événement → directement au calendrier (la fiche du calendrier s'ouvre : jour, heure, domaine…) ;
//    - tâche / idée → Urgent / Important / Ne sais pas (+ date limite pour une tâche),
// 5) le domaine. Fermer ou « Noter pour plus tard » à n'importe quelle étape : rien n'est perdu, ça part En vrac.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { todayKey } from '../calendar/dates';
import { DomainPicker } from '../calendar/DomainPicker';
import { blankEvent } from '../calendar/EventEditor';
import type { CalendarEvent } from '../calendar/model';
import { colors, radius } from '../theme';
import { Button, Field, Icon, Sheet, Txt } from '../ui';
import { ContentField, DeadlineField, PriorityWords, st as fst } from './fields';
import { applyDeadline, newId, newTask, PROGRAM_TYPES, ProgramType, quadrantInfo, quadrantOf, Task } from './model';
import { useTasks } from './TasksContext';

type Step = 'type' | 'contenu' | 'priorite' | 'domaine';

export function ProgramSheet({ title, onClose, onEvent }: {
  /** Titre noté en haut de l'écran ; null = fermé. */
  title: string | null;
  onClose: () => void;
  /** Rendez-vous ou événement : ouvre la fiche du calendrier avec ce brouillon. */
  onEvent: (e: CalendarEvent) => void;
}) {
  const { save } = useTasks();
  const { domains } = useCalendar();
  const today = todayKey();
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<ProgramType | null>(null);
  const [t, setT] = useState<Task | null>(null);

  useEffect(() => {
    setStep('type');
    setType(null);
    setT(title === null ? null : newTask(title, today));
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  if (title === null || !t) return null;
  const patch = (p: Partial<Task>) => setT({ ...t, ...p });
  const titleOk = t.title.trim().length > 0;
  const isEvent = type === 'rdv' || type === 'evenement';

  const clean = (x: Task): Task => applyDeadline({
    ...x,
    title: x.title.trim(),
    type: type === 'idee' ? 'idee' : 'tache',
    note: x.kind === 'liste' ? x.note : x.note?.trim() || undefined,
    items: x.kind === 'liste' ? (x.items ?? []).filter((i) => i.text.trim()).map((i) => ({ ...i, text: i.text.trim() })) : x.items,
    deadline: type === 'tache' ? x.deadline : undefined,
  }, today);

  /** Fermer sans aller au bout : rien n'est perdu. Sans priorité choisie, elle attend En vrac. */
  const later = () => {
    if (titleOk) save(clean(t));
    onClose();
  };

  const finish = () => {
    if (!titleOk) return;
    save(clean(t));
    onClose();
  };

  const toCalendar = () => {
    if (!titleOk || !type) return;
    const list = t.kind === 'liste' ? (t.items ?? []).filter((i) => i.text.trim()) : [];
    const e = blankEvent(today, 9 * 60, domains[0]?.id);
    onEvent({
      ...e,
      title: t.title.trim(),
      nature: type === 'evenement' ? 'evenement' : 'rdv',
      kinds: list.length ? ['rdv', 'objet'] : ['rdv'],
      items: list.length ? list : undefined,
      note: t.kind === 'liste' ? undefined : t.note?.trim() || undefined,
    });
  };

  const setKind = (kind: 'tache' | 'liste') =>
    patch({ kind, ...(kind === 'liste' && !(t.items ?? []).length ? { items: [{ id: newId(), text: '' }] } : {}) });

  const back = () => setStep(step === 'domaine' ? 'priorite' : step === 'priorite' ? 'contenu' : 'type');
  const typeInfo = PROGRAM_TYPES.find((x) => x.id === type);
  const q = quadrantOf(t);

  const footer = step === 'type' ? (
    <Button label="Noter pour plus tard" kind="ghost" icon="inbox" onPress={later} />
  ) : (
    <>
      {step === 'contenu' && isEvent ? (
        <Button label="Choisir le jour et l’heure" kind="dark" icon="calendar" onPress={toCalendar} />
      ) : step === 'contenu' ? (
        <Button label="Suivant : la priorité" kind="dark" onPress={() => setStep('priorite')} />
      ) : step === 'priorite' ? (
        <Button label="Suivant : le domaine" kind="dark" onPress={() => setStep('domaine')} />
      ) : (
        <Button label="Valider" kind="dark" onPress={finish} />
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Retour" kind="ghost" icon="chevron-left" onPress={back} style={{ flex: 1 }} />
        {!isEvent ? <Button label="Plus tard" kind="ghost" icon="inbox" onPress={later} style={{ flex: 1 }} /> : null}
      </View>
    </>
  );

  return (
    <Sheet visible onClose={later} title={step === 'type' ? 'Programmer' : typeInfo?.label ?? 'Programmer'} footer={footer}>
      <TextInput
        accessibilityLabel="Titre"
        value={t.title}
        onChangeText={(v) => patch({ title: v })}
        placeholder="Le titre"
        placeholderTextColor={colors.faint}
        style={[fst.input, st.title]}
      />

      {step === 'type' ? (
        <Field label="C’est…">
          <View style={st.types}>
            {PROGRAM_TYPES.map((x) => (
              <Pressable
                key={x.id}
                accessibilityRole="button"
                accessibilityLabel={`${x.label} : ${x.examples}`}
                onPress={() => { if (!titleOk) return; setType(x.id); setStep('contenu'); }}
                style={({ pressed }) => [st.type, pressed && { backgroundColor: colors.accentSoft }, !titleOk && { opacity: 0.45 }]}
              >
                <Icon name={x.icon} size={22} color={colors.accentDark} />
                <Txt bold size={16}>{x.label}</Txt>
                <Txt size={13} color={colors.muted}>{x.examples}</Txt>
              </Pressable>
            ))}
          </View>
        </Field>
      ) : null}

      {step === 'contenu' ? (
        <Field label="Note ou check-liste" hint={isEvent ? 'Facultatif. Ensuite : le jour et l’heure.' : 'Facultatif. Tu peux passer directement à la suite.'}>
          <ContentField
            kind={t.kind ?? 'tache'}
            note={t.note ?? ''}
            items={t.items ?? []}
            onKind={setKind}
            onNote={(note) => patch({ note })}
            onItems={(items) => patch({ items })}
          />
        </Field>
      ) : null}

      {step === 'priorite' ? (
        <>
          <Field label="Priorité" hint={`Rangée dans « ${quadrantInfo(q).label} ».`}>
            <PriorityWords important={t.important} urgent={t.urgent} onChange={(p) => patch(p)} />
          </Field>
          {type === 'tache' ? (
            <Field label="Date limite" hint="Facultatif. Deux jours avant, elle passe en urgent toute seule.">
              <DeadlineField value={t.deadline} today={today} onChange={(deadline) => patch({ deadline })} />
            </Field>
          ) : null}
        </>
      ) : null}

      {step === 'domaine' ? (
        <Field label="Domaine" hint="Une simple étiquette, pour les bilans.">
          <DomainPicker value={t.category} onChange={(category) => patch({ category })} allowNone />
        </Field>
      ) : null}
    </Sheet>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 18 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  type: {
    flexBasis: '47%', flexGrow: 1, minHeight: 104, padding: 14, gap: 4, borderRadius: radius.l,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
  },
});
