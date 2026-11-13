// « Programmer » (13 nov., parcours de Valentin) : une seule porte d'entrée pour tout ce qui va dans l'appli.
// 1) le titre (noté en haut de l'écran), 2) le type : Rendez-vous, Événement, Tâche, Idée ou Rappel,
// 3) le contenu : encart libre ou check-liste, 4) la suite :
//    - rendez-vous / événement → directement au calendrier (la fiche du calendrier s'ouvre : jour, heure, domaine…) ;
//    - tâche / idée → Urgent / Important / Ne sais pas, puis le domaine ;
//    - rappel → le jour du rappel et la date butoir (bandeau au calendrier ce jour-là, pop-up chaque jour jusqu'à programmation).
// Fermer ou « Plus tard » à n'importe quelle étape : rien n'est perdu, ça part En vrac.
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { addDays, todayKey } from '../calendar/dates';
import type { DayKey } from '../calendar/dates';
import { DomainPicker } from '../calendar/DomainPicker';
import { blankEvent } from '../calendar/EventEditor';
import { blankRappel } from '../calendar/model';
import type { CalendarEvent } from '../calendar/model';
import { colors, radius } from '../theme';
import { Button, Field, Icon, Sheet, Txt } from '../ui';
import { ContentField, DayField, DeadlineField, PriorityWords, st as fst } from './fields';
import { newId, newTask, PROGRAM_TYPES, ProgramType, quadrantInfo, quadrantOf, Task } from './model';
import { useTasks } from './TasksContext';

type Step = 'type' | 'contenu' | 'priorite' | 'domaine' | 'rappel';

/** Brouillon de départ (pop-up d'un rappel : « Impôts » déjà rempli, type Tâche). */
export interface ProgramStart {
  title: string;
  type?: ProgramType;
  note?: string;
  items?: Task['items'];
  category?: string;
}

export function ProgramSheet({ start, onClose, onEvent, onSaved }: {
  /** null = fermé. */
  start: ProgramStart | null;
  onClose: () => void;
  /** Rendez-vous ou événement : ouvre la fiche du calendrier avec ce brouillon. */
  onEvent: (e: CalendarEvent) => void;
  /** Appelé dès que quelque chose est enregistré (ou envoyé au calendrier). */
  onSaved?: () => void;
}) {
  const { save } = useTasks();
  const { domains, saveEvent } = useCalendar();
  const today = todayKey();
  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<ProgramType | null>(null);
  const [t, setT] = useState<Task | null>(null);
  const [rappel, setRappel] = useState<{ day: DayKey; butoir?: DayKey }>({ day: today });

  useEffect(() => {
    setStep(start?.type ? 'contenu' : 'type');
    setType(start?.type ?? null);
    setRappel({ day: addDays(todayKey(), 1) });
    setT(start === null ? null : {
      ...newTask(start.title, todayKey()),
      note: start.note, items: start.items, kind: start.items?.length ? 'liste' : undefined, category: start.category,
    });
  }, [start]);

  if (start === null || !t) return null;
  const patch = (p: Partial<Task>) => setT({ ...t, ...p });
  const titleOk = t.title.trim().length > 0;
  const isEvent = type === 'rdv' || type === 'evenement';
  const list = t.kind === 'liste' ? (t.items ?? []).filter((i) => i.text.trim()).map((i) => ({ ...i, text: i.text.trim() })) : [];
  const note = t.kind === 'liste' ? undefined : t.note?.trim() || undefined;

  const clean = (x: Task): Task => ({
    ...x,
    title: x.title.trim(),
    type: type === 'idee' ? 'idee' : 'tache',
    note: x.kind === 'liste' ? x.note : note,
    items: x.kind === 'liste' ? list : x.items,
  });

  /** Fermer sans aller au bout : rien n'est perdu. Sans priorité choisie, elle attend En vrac. */
  const later = () => {
    if (titleOk) { save(clean(t)); onSaved?.(); }
    onClose();
  };

  const finish = () => {
    if (!titleOk) return;
    save(clean(t));
    onSaved?.();
    onClose();
  };

  const toCalendar = () => {
    if (!titleOk || !type) return;
    const e = blankEvent(today, 9 * 60, t.category ?? domains[0]?.id);
    onSaved?.();
    onEvent({
      ...e,
      title: t.title.trim(),
      nature: type === 'evenement' ? 'evenement' : 'rdv',
      kinds: list.length ? ['rdv', 'objet'] : ['rdv'],
      items: list.length ? list : undefined,
      note,
    });
  };

  const saveRappel = () => {
    if (!titleOk) return;
    saveEvent({
      ...blankRappel(rappel.day, t.category ?? domains[0]?.id ?? 'perso'),
      title: t.title.trim(), butoir: rappel.butoir, note, items: list.length ? list : undefined,
    });
    onSaved?.();
    onClose();
  };

  const setKind = (kind: 'tache' | 'liste') =>
    patch({ kind, ...(kind === 'liste' && !(t.items ?? []).length ? { items: [{ id: newId(), text: '' }] } : {}) });

  const back = () => setStep(step === 'domaine' ? 'priorite' : step === 'priorite' || step === 'rappel' ? 'contenu' : 'type');
  const typeInfo = PROGRAM_TYPES.find((x) => x.id === type);
  const q = quadrantOf(t);

  const main =
    step === 'contenu' && isEvent ? <Button label="Choisir le jour et l’heure" kind="dark" icon="calendar" onPress={toCalendar} />
      : step === 'contenu' && type === 'rappel' ? <Button label="Suivant : le jour du rappel" kind="dark" onPress={() => setStep('rappel')} />
        : step === 'contenu' ? <Button label="Suivant : la priorité" kind="dark" onPress={() => setStep('priorite')} />
          : step === 'priorite' ? <Button label="Suivant : le domaine" kind="dark" onPress={() => setStep('domaine')} />
            : step === 'rappel' ? <Button label="Mettre au calendrier" kind="dark" icon="bell" onPress={saveRappel} />
              : <Button label="Valider" kind="dark" onPress={finish} />;

  const footer = step === 'type' ? (
    <Button label="Noter pour plus tard" kind="ghost" icon="inbox" onPress={later} />
  ) : (
    <>
      {main}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Retour" kind="ghost" icon="chevron-left" onPress={back} style={{ flex: 1 }} />
        {!isEvent && type !== 'rappel' ? <Button label="Plus tard" kind="ghost" icon="inbox" onPress={later} style={{ flex: 1 }} /> : null}
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
        <Field
          label="Note ou check-liste"
          hint={isEvent ? 'Facultatif. Ensuite : le jour et l’heure.' : type === 'rappel' ? 'Facultatif. Elle sera reprise dans la tâche le jour du rappel.' : 'Facultatif. Tu peux passer directement à la suite.'}
        >
          <ContentField
            kind={t.kind ?? 'tache'}
            note={t.note ?? ''}
            items={t.items ?? []}
            onKind={setKind}
            onNote={(n) => patch({ note: n })}
            onItems={(items) => patch({ items })}
          />
        </Field>
      ) : null}

      {step === 'priorite' ? (
        <Field label="Priorité" hint={`Rangée dans « ${quadrantInfo(q).label} ».`}>
          <PriorityWords important={t.important} urgent={t.urgent} onChange={(p) => patch(p)} />
        </Field>
      ) : null}

      {step === 'domaine' ? (
        <Field label="Domaine" hint="Une simple étiquette, pour les bilans.">
          <DomainPicker value={t.category} onChange={(category) => patch({ category })} allowNone />
        </Field>
      ) : null}

      {step === 'rappel' ? (
        <>
          <Field label="Me le rappeler le" hint="Ce jour-là, un bandeau au calendrier et un pop-up pour programmer la tâche. Il revient chaque jour tant que ce n’est pas programmé.">
            <DayField value={rappel.day} min={today} onChange={(day) => setRappel({ day, butoir: rappel.butoir && rappel.butoir < day ? day : rappel.butoir })} />
          </Field>
          <Field label="Date butoir" hint="Facultatif.">
            <DeadlineField
              value={rappel.butoir}
              today={today}
              min={rappel.day}
              prefix="À faire avant le"
              removeLabel="Pas de date butoir"
              onChange={(butoir) => setRappel({ ...rappel, butoir })}
            />
          </Field>
        </>
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
