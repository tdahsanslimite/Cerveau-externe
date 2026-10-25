// Fiche d'un événement venu d'un agenda du téléphone (Google Agenda, Planning BAM…) : lecture seule.
import React from 'react';
import { View } from 'react-native';
import { colors } from '../theme';
import { Field, Sheet, Txt } from '../ui';
import { useCalendar } from './CalendarContext';
import { labelDayLong, minutesToLabel } from './dates';
import { CalendarEvent, endOf } from './model';

export function PhoneEventSheet({ event, onClose }: { event: CalendarEvent | null; onClose: () => void }) {
  const { domain } = useCalendar();
  if (!event?.phone) return null;
  const cal = domain(event.category);
  const when = event.start === null
    ? event.endDate ? `Du ${labelDayLong(event.date)} au ${labelDayLong(event.endDate)}` : `${labelDayLong(event.date)}, toute la journée`
    : `${labelDayLong(event.date)}, ${minutesToLabel(event.start)} – ${minutesToLabel(endOf(event))}`;
  return (
    <Sheet visible onClose={onClose} title={event.title}>
      <Field label="Quand">
        <Txt size={16}>{when}</Txt>
      </Field>
      {event.phone.location ? (
        <Field label="Lieu">
          <Txt size={16} selectable>{event.phone.location}</Txt>
        </Field>
      ) : null}
      <Field label="Vient de l'agenda">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cal.color }} />
          <Txt size={16}>{event.phone.calendarTitle}</Txt>
        </View>
      </Field>
      <Txt size={14} color={colors.muted} style={{ lineHeight: 20 }}>
        Cet événement est lu depuis l'agenda de ton téléphone. Pour le modifier ou le supprimer, passe par Google Agenda (ou l'appli d'origine) : Cerveau Externe se met à jour tout seul.
      </Txt>
    </Sheet>
  );
}
