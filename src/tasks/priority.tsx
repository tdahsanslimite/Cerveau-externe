// Priorité des tâches : règle « une seule chose à la fois », déplacement dans la matrice,
// et requalification proposée dès qu'une tâche est cochée.
// Tout passe par la liste unique (tâches du module + événements « Tâche » du calendrier).
import React, { ReactElement, useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { labelDayShort, relativeLabel } from '../calendar/dates';
import { colors, radius } from '../theme';
import { Button, Card, Icon, Sheet, Txt } from '../ui';
import { inSas, oneThing, priorityOf, QUADRANTS, quadrantInfo, QuadrantId, quadrantOf, TaskItem, waitingItems } from './model';
import { useTasks } from './TasksContext';
import { useTaskItems } from './useTaskItems';

export interface PriorityChoice {
  important: boolean;
  urgent: boolean;
}

const short = (title: string, max = 30) => (title.length > max ? `${title.slice(0, max - 1).trim()}…` : title);

/** Applique une priorité à un élément de la liste, où qu'il vive (module Tâches ou calendrier). */
export function useApplyPriority() {
  const { tasks, save } = useTasks();
  const { events, saveEvent } = useCalendar();
  return useCallback(
    (key: string, important: boolean, urgent: boolean) => {
      const id = key.slice(key.indexOf(':') + 1);
      if (key.startsWith('task:')) {
        const t = tasks.find((x) => x.id === id);
        if (t) save({ ...t, important, urgent });
      } else {
        const e = events.find((x) => x.id === id);
        if (e) saveEvent({ ...e, important, urgent });
      }
    },
    [tasks, events, save, saveEvent],
  );
}

// ---------------- Une seule chose à la fois ----------------

interface Pending {
  candidate: { key: string; title: string };
  holder: TaskItem;
  onDecided: (p: PriorityChoice) => void;
}

/**
 * Garde de la règle « une seule chose importante ET urgente ».
 * `ask(candidate, onDecided)` : s'il n'y a pas déjà une chose, `onDecided` est appelé tout de suite avec « important + urgent » ;
 * sinon une feuille demande laquelle reste la chose et où l'autre attend, puis `onDecided` reçoit la priorité finale du candidat.
 * `ignoreKeys` : éléments à ne pas compter (par ex. la tâche qu'on est en train de transformer en événement).
 * `sheet` est à afficher dans le composant qui appelle `ask`.
 */
export function useOneThing(): {
  ask: (candidate: { key: string; title: string }, onDecided: (p: PriorityChoice) => void, ignoreKeys?: string[]) => void;
  sheet: ReactElement | null;
} {
  const items = useTaskItems();
  const [pending, setPending] = useState<Pending | null>(null);

  const ask = useCallback(
    (candidate: { key: string; title: string }, onDecided: (p: PriorityChoice) => void, ignoreKeys: string[] = []) => {
      const holder = oneThing(items, [candidate.key, ...ignoreKeys]);
      if (!holder) onDecided({ important: true, urgent: true });
      else setPending({ candidate, holder, onDecided });
    },
    [items],
  );

  const sheet = pending ? (
    <OneThingSheet
      candidate={pending.candidate}
      holder={pending.holder}
      onDecided={pending.onDecided}
      onClose={() => setPending(null)}
    />
  ) : null;
  return { ask, sheet };
}

function OneThingSheet({ candidate, holder, onDecided, onClose }: {
  candidate: { key: string; title: string }; holder: TaskItem; onDecided: (p: PriorityChoice) => void; onClose: () => void;
}) {
  const apply = useApplyPriority();
  const [winner, setWinner] = useState<'holder' | 'candidate' | null>(null);
  const loser = winner === 'holder' ? candidate : holder;

  const wait = (q: Extract<QuadrantId, 'planifier' | 'alleger'>) => {
    const p = priorityOf(q);
    if (winner === 'holder') {
      onDecided(p); // la nouvelle attend
    } else {
      apply(holder.key, p.important, p.urgent); // l'ancienne chose attend, la nouvelle prend la place
      onDecided({ important: true, urgent: true });
    }
    onClose();
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title="Une seule chose à la fois"
      footer={
        <>
          {winner ? <Button label="Retour" kind="ghost" icon="arrow-left" onPress={() => setWinner(null)} /> : null}
          <Button label="Annuler" kind="ghost" onPress={onClose} />
        </>
      }
    >
      {winner === null ? (
        <>
          <Txt size={15} color={colors.muted} style={{ lineHeight: 22 }}>
            « {holder.title} » est déjà ta chose importante ET urgente. Il ne peut y en avoir qu’une : le reste attend.
          </Txt>
          <Question text="Laquelle reste LA chose ?">
            <Button label={`Garder « ${short(holder.title)} »`} kind="dark" onPress={() => setWinner('holder')} />
            <Button label={`« ${short(candidate.title)} » passe devant`} kind="ghost" onPress={() => setWinner('candidate')} />
          </Question>
        </>
      ) : (
        <Question text={`« ${short(loser.title)} » attend dans…`}>
          <Button label="Important seulement · à planifier" kind="dark" onPress={() => wait('planifier')} />
          <Button label="Urgent seulement · à déléguer ou alléger" kind="ghost" onPress={() => wait('alleger')} />
        </Question>
      )}
    </Sheet>
  );
}

// ---------------- Déplacer dans la matrice ----------------

/** Feuille « Déplacer » : une case de la matrice en un geste. Vers « à faire en premier », la règle d'une seule chose s'applique. */
export function MoveSheet({ item, onClose }: { item: TaskItem | null; onClose: () => void }) {
  const apply = useApplyPriority();
  const { ask, sheet } = useOneThing();
  if (!item) return null;
  const current = quadrantOf(item);

  const move = (q: QuadrantId) => {
    if (q === current) {
      onClose();
    } else if (q === 'faire') {
      ask({ key: item.key, title: item.title }, (p) => {
        apply(item.key, p.important, p.urgent);
        onClose();
      });
    } else {
      const p = priorityOf(q);
      apply(item.key, p.important, p.urgent);
      onClose();
    }
  };

  return (
    <>
      <Sheet visible onClose={onClose} title="Déplacer" footer={<Button label="Annuler" kind="ghost" onPress={onClose} />}>
        <Txt bold size={18} style={{ lineHeight: 25 }}>{item.title}</Txt>
        <View style={{ gap: 10 }}>
          {QUADRANTS.map((q) => {
            const on = q.id === current;
            return (
              <Pressable
                key={q.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Mettre dans ${q.label}`}
                onPress={() => move(q.id)}
                style={({ pressed }) => [st.choice, on && st.choiceOn, pressed && { opacity: 0.7 }]}
              >
                <Icon name={q.icon} size={20} color={on ? colors.accentDark : colors.ink} />
                <View style={{ flex: 1 }}>
                  <Txt bold size={15}>{q.label}</Txt>
                  <Txt size={13} color={colors.muted}>{q.hint}</Txt>
                </View>
                {on ? <Icon name="check" size={18} color={colors.accentDark} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
      {sheet}
    </>
  );
}

// ---------------- Après une tâche cochée : on requalifie ----------------

/**
 * Proposée dès qu'une tâche est cochée et que la place de « la chose » est libre :
 * on choisit ce qui devient la prochaine chose importante ET urgente parmi ce qui attend, ou on trie le sas.
 */
export function AdvanceSheet({ visible, onClose, onSort }: { visible: boolean; onClose: () => void; onSort: () => void }) {
  const items = useTaskItems();
  const apply = useApplyPriority();
  if (!visible) return null;
  const waiting = waitingItems(items).slice(0, 5);
  const sas = inSas(items).length;

  const sort = () => {
    onClose();
    onSort();
  };

  return (
    <Sheet visible onClose={onClose} title="Bien joué" footer={<Button label="Plus tard" kind="ghost" onPress={onClose} />}>
      {waiting.length > 0 ? (
        <>
          <View style={{ gap: 4 }}>
            <Txt bold size={22}>Quelle est LA chose maintenant ?</Txt>
            <Txt size={14} color={colors.muted} style={{ lineHeight: 20 }}>
              La place est libre. Une seule, importante ET urgente : le reste continue d’attendre.
            </Txt>
          </View>
          <Card>
            {waiting.map((i) => {
              const q = quadrantOf(i);
              const meta = [q ? quadrantInfo(q).label : null, i.day ? (relativeLabel(i.day) ?? labelDayShort(i.day)) : null].filter(Boolean).join(' · ');
              return (
                <Pressable
                  key={i.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Faire de « ${i.title} » la chose du moment`}
                  onPress={() => {
                    apply(i.key, true, true);
                    onClose();
                  }}
                  style={({ pressed }) => [st.candidate, pressed && { backgroundColor: colors.accentSoft }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt bold size={15} numberOfLines={2}>{i.title}</Txt>
                    {meta ? <Txt size={13} color={colors.muted}>{meta}</Txt> : null}
                  </View>
                  <Icon name="zap" size={18} color={colors.accent} />
                </Pressable>
              );
            })}
          </Card>
          {sas > 0 ? <Button label={`Trier le sas (${sas})`} kind="ghost" icon="shuffle" onPress={sort} /> : null}
        </>
      ) : (
        <>
          <View style={{ gap: 4 }}>
            <Txt bold size={22}>Rien n’attend en « important » ou « urgent ».</Txt>
            <Txt size={14} color={colors.muted} style={{ lineHeight: 20 }}>
              Il reste {sas} {sas > 1 ? 'éléments' : 'élément'} dans le sas. Les trier te dira quelle est la prochaine chose.
            </Txt>
          </View>
          <Button label={`Trier le sas (${sas})`} kind="dark" icon="shuffle" onPress={sort} />
        </>
      )}
    </Sheet>
  );
}

function Question({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Txt bold size={22} style={{ lineHeight: 29 }}>{text}</Txt>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

const st = StyleSheet.create({
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
  },
  choiceOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  candidate: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.lineSoft,
  },
});
