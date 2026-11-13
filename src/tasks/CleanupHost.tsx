// Ménage de la veille (13 nov., Valentin) : en entrant dans « Organiser et planifier », avant de lancer quoi que ce soit,
// tout ce qui avait une heure les jours passés et n'a pas été coché revient, UN PAR UN, sans compteur
// (« le pop-up suivant est une nouvelle notif de dopamine »). Impossible de passer sans répondre :
// C'est fait (coché) / Reprogrammer (un nouveau créneau, le passé reste comme historique) / Ça n'a pas eu lieu.
// Le bouton retour du téléphone ramène à l'accueil (on n'entre pas dans Organiser sans avoir fait le ménage).
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useCalendar } from '../calendar/CalendarContext';
import { labelDayLong, minutesToLabel, relativeLabel, todayKey } from '../calendar/dates';
import { EditorState, EventEditor } from '../calendar/EventEditor';
import { endOf, kindsOf, natureLabel, natureOf, nextToReview, Occurrence, pendingItems, reprogramCopy } from '../calendar/model';
import { useSettings } from '../settings/SettingsContext';
import { colors, radius } from '../theme';
import { Button, Icon, Sheet, Txt } from '../ui';

export function CleanupHost({ active, onLeave }: { active: boolean; onLeave: () => void }) {
  const { events, loaded, saveEvent, toggleDone, domain } = useCalendar();
  const { settings, loaded: settingsLoaded, update } = useSettings();
  const [today, setToday] = useState(todayKey());
  const [reprog, setReprog] = useState<{ state: EditorState; occ: Occurrence } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setToday(todayKey()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Première fois avec cette version : on ne rattrape pas l'historique, le ménage commence à partir d'aujourd'hui.
  useEffect(() => {
    if (settingsLoaded && !settings.reviewFrom) update({ reviewFrom: todayKey() });
  }, [settingsLoaded, settings.reviewFrom, update]);

  const occ = active && loaded && settingsLoaded && settings.reviewFrom && !reprog ? nextToReview(events, today, settings.reviewFrom) : null;

  const reviewed = (o: Occurrence) => saveEvent({ ...o.event, reviewedDays: [...(o.event.reviewedDays ?? []), o.day] });

  return (
    <>
      {occ ? (
        <Sheet
          visible
          closable={false}
          onClose={onLeave}
          title="Avant de commencer"
          footer={
            <>
              <Button label="C’est fait" kind="dark" icon="check" onPress={() => toggleDone(occ.event.id, occ.day)} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  label="Reprogrammer"
                  kind="ghost"
                  icon="corner-up-right"
                  style={{ flex: 1 }}
                  onPress={() => setReprog({ occ, state: { event: reprogramCopy(occ.event, today), isNew: true, day: today } })}
                />
                <Button label="Pas eu lieu" kind="ghost" icon="x" style={{ flex: 1 }} onPress={() => reviewed(occ)} />
              </View>
            </>
          }
        >
          <Txt size={16}>
            {(relativeLabel(occ.day, today) ?? labelDayLong(occ.day))}, c’était prévu. C’est fait ?
          </Txt>
          <View style={st.card}>
            <View style={{ width: 56 }}>
              <Txt bold size={16}>{minutesToLabel(occ.event.start as number)}</Txt>
              <Txt size={12} color={colors.faint}>{minutesToLabel(endOf(occ.event))}</Txt>
            </View>
            <View style={[st.bar, { backgroundColor: domain(occ.event.category).color }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt bold size={18}>{occ.event.title}</Txt>
              <Txt size={14} color={colors.muted}>
                {kindsOf(occ.event).includes('rdv') ? natureLabel(natureOf(occ.event)) : kindsOf(occ.event).includes('objet') ? 'Liste' : 'Tâche'}
                {' · '}{domain(occ.event.category).label}
              </Txt>
              {pendingItems(occ.event).length ? (
                <Txt size={14} color={colors.muted}>Pas coché : {pendingItems(occ.event).map((i) => i.text).join(', ')}</Txt>
              ) : null}
            </View>
          </View>
          <View style={st.hint}>
            <Icon name="info" size={16} color={colors.muted} />
            <Txt size={13} color={colors.muted} style={{ flex: 1 }}>Reprogrammer : tu choisis un nouveau créneau, l’ancien reste dans ton historique.</Txt>
          </View>
        </Sheet>
      ) : null}

      <EventEditor
        state={reprog?.state ?? null}
        onClose={() => setReprog(null)}
        onSaved={() => { if (reprog) reviewed(reprog.occ); }}
      />
    </>
  );
}

const st = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.l,
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
  },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  hint: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});
