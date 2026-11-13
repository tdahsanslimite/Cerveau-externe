/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addMonths, isoWeek, monthGrid, startOfWeek, weekdayIndex, labelWeekRange, relativeLabel, minutesToLabel, durationLabel } from './dates.ts';
import { planReminders } from './reminders.ts';
import { occursOn, occurrencesOn, loadLevel, freeSlots, findConflict, nextFreeStart, minutesByDomain, hoursByDomain, topDomains, subDomains, rootOf, domainOf, groupHours, reminderMinutes, reminderLabel } from './model.ts';
import type { CalendarEvent, Domain } from './model.ts';

test('navigation entre jours, y compris changement de mois, d’année et heure d’été', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30'); // passage à l'heure d'été
  assert.equal(addDays('2026-10-24', 2), '2026-10-26'); // retour à l'heure d'hiver
});

test('ajout de mois borné au dernier jour', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-10-13', -1), '2026-09-13');
  assert.equal(addMonths('2026-12-15', 1), '2027-01-15');
});

test('semaine qui commence le lundi', () => {
  assert.equal(weekdayIndex('2026-10-12'), 0); // lundi
  assert.equal(weekdayIndex('2026-10-18'), 6); // dimanche
  assert.equal(startOfWeek('2026-10-18'), '2026-10-12');
  assert.equal(isoWeek('2026-10-13'), 42);
  assert.equal(isoWeek('2027-01-01'), 53);
  assert.equal(labelWeekRange('2026-10-13'), '12 – 18 oct.');
  assert.equal(labelWeekRange('2026-10-28'), '26 oct. – 1 nov.');
});

test('grille du mois en semaines complètes', () => {
  const oct = monthGrid('2026-10-13');
  assert.equal(oct.length % 7, 0);
  assert.equal(oct[0].key, '2026-09-28');
  assert.equal(oct.filter((c) => c.inMonth).length, 31);
  const feb = monthGrid('2027-02-10'); // février 2027 : du lundi 1er au dimanche 28
  assert.equal(feb.length, 28);
});

test('libellés', () => {
  assert.equal(relativeLabel('2026-10-14', '2026-10-13'), 'Demain');
  assert.equal(relativeLabel('2026-10-20', '2026-10-13'), null);
  assert.equal(minutesToLabel(9 * 60 + 5), '09:05');
  assert.equal(durationLabel(90), '1 h 30');
  assert.equal(durationLabel(45), '45 min');
});

const ev = (o: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'x', title: 'Test', date: '2026-10-13', start: 600, durationMin: 60, category: 'travail', repeat: 'none', ...o,
});

test('récurrences', () => {
  const weekly = ev({ repeat: 'weekly' });
  assert.ok(occursOn(weekly, '2026-10-20'));
  assert.ok(!occursOn(weekly, '2026-10-21'));
  assert.ok(!occursOn(weekly, '2026-10-06')); // avant le début
  const wd = ev({ repeat: 'weekdays' });
  assert.ok(occursOn(wd, '2026-10-16'));
  assert.ok(!occursOn(wd, '2026-10-17'));
  const skipped = ev({ repeat: 'daily', skipped: ['2026-10-15'] });
  assert.ok(!occursOn(skipped, '2026-10-15'));
  assert.ok(occursOn(skipped, '2026-10-16'));
});

test('tri des occurrences : journée entière puis heure', () => {
  const list = occurrencesOn([
    ev({ id: 'b', title: 'Soir', start: 1200 }),
    ev({ id: 'a', title: 'Anniv', start: null }),
    ev({ id: 'c', title: 'Matin', start: 480 }),
  ], '2026-10-13');
  assert.deepEqual(list.map((o) => o.event.id), ['a', 'c', 'b']);
});

test('charge du jour relative à la limite', () => {
  assert.equal(loadLevel(0, 6), 'vide');
  assert.equal(loadLevel(2, 6), 'legere');
  assert.equal(loadLevel(5, 6), 'equilibree');
  assert.equal(loadLevel(6, 6), 'chargee');
  assert.equal(loadLevel(7, 6), 'trop');
});

test('créneaux libres, avec chevauchement', () => {
  const occs = occurrencesOn([
    ev({ id: '1', start: 9 * 60, durationMin: 120 }),      // 9h-11h
    ev({ id: '2', start: 10 * 60, durationMin: 90 }),      // 10h-11h30 (chevauche)
    ev({ id: '3', start: 12 * 60, durationMin: 60 }),      // 12h-13h (trou de 30 min avant : ignoré)
    ev({ id: '4', start: 17 * 60, durationMin: 120 }),     // 17h-19h
    ev({ id: '5', start: null }),                          // journée : ignoré
  ], '2026-10-13');
  assert.deepEqual(freeSlots(occs), [
    { from: 8 * 60, to: 9 * 60 },
    { from: 13 * 60, to: 17 * 60 },
    { from: 19 * 60, to: 21 * 60 },
  ]);
  assert.deepEqual(freeSlots([]), [{ from: 480, to: 1260 }]);
});

test('chevauchements : bloque, ignore la journée entière et l’événement lui-même', () => {
  const dentist = ev({ id: 'd', start: 10 * 60, durationMin: 60 });           // 10h-11h
  const trampo = ev({ id: 't', date: '2026-10-07', start: 17 * 60, durationMin: 120, repeat: 'weekly' }); // mer. 17h-19h
  const allDay = ev({ id: 'a', start: null, kinds: ['objet'], item: 'cadeau' }); // un objet « journée » ne bloque rien
  const events = [dentist, trampo, allDay];
  assert.equal(findConflict(events, ev({ id: 'n', start: 10 * 60 + 30, durationMin: 30 }))?.event.id, 'd');
  assert.equal(findConflict(events, ev({ id: 'n', start: 11 * 60, durationMin: 30 })), null); // bout à bout : OK
  assert.equal(findConflict(events, ev({ id: 'n', start: 9 * 60, durationMin: 60 })), null);
  assert.equal(findConflict(events, { ...dentist }), null); // se modifier soi-même
  // Une série hebdo du mardi qui tombe un mercredi 3 semaines plus tard ? Non : on teste un mercredi.
  const conflict = findConflict(events, ev({ id: 'n', date: '2026-10-28', start: 18 * 60, durationMin: 30 }));
  assert.equal(conflict?.event.id, 't');
  // Une nouvelle série quotidienne qui finit par croiser le trampoline du mercredi
  const daily = findConflict(events, ev({ id: 'n', date: '2026-10-13', start: 18 * 60, durationMin: 30, repeat: 'daily' }));
  assert.deepEqual([daily?.event.id, daily?.day], ['t', '2026-10-14']);
});

test('prochain créneau libre après un conflit', () => {
  const events = [ev({ id: 'd', start: 10 * 60, durationMin: 60 }), ev({ id: 'e', start: 11 * 60, durationMin: 30 })];
  assert.equal(nextFreeStart(events, ev({ id: 'n', start: 10 * 60, durationMin: 45 }), 10 * 60), 11 * 60 + 30);
});

test('heures par domaine sur une période', () => {
  const events = [
    ev({ id: '1', category: 'travail', start: 9 * 60, durationMin: 120 }),
    ev({ id: '2', category: 'sport', start: 18 * 60, durationMin: 60, repeat: 'daily' }),
    ev({ id: '3', category: 'sport', start: null }),
  ];
  assert.deepEqual(minutesByDomain(events, '2026-10-13', '2026-10-15'), { travail: 120, sport: 180 });
});

test('rappels', () => {
  assert.equal(reminderMinutes({ amount: 2, unit: 'h' }), 120);
  assert.equal(reminderMinutes({ amount: 1, unit: 'j' }), 1440);
  assert.equal(reminderLabel({ amount: 1, unit: 'j' }), '1 jour avant');
  assert.equal(reminderLabel({ amount: 30, unit: 'min' }), '30 min avant');
});

test('rappels programmés : heures exactes, objet, veille au soir, passé ignoré', () => {
  const now = new Date(2026, 9, 15, 11, 0); // jeudi 15 oct. 11:00
  const irm = ev({
    id: 'irm', title: 'IRM', date: '2026-10-16', start: 10 * 60, durationMin: 45,
    kinds: ['rdv', 'objet'], item: 'devis signé', itemEveReminder: true,
    reminders: [{ amount: 1, unit: 'h' }, { amount: 1, unit: 'j' }],
  });
  const past = ev({ id: 'p', date: '2026-10-15', start: 9 * 60, reminders: [{ amount: 30, unit: 'min' }] });
  const plan = planReminders([irm, past], now, '2026-10-15');
  const at = (p: { at: Date }) => `${p.at.getDate()} ${p.at.getHours()}:${String(p.at.getMinutes()).padStart(2, '0')}`;
  assert.deepEqual(plan.map(at), ['15 20:00', '16 9:00']); // veille 20 h ; 1 h avant. « 1 jour avant » (15 à 10:00) est déjà passé
  assert.equal(plan[0].title, 'Demain : IRM');
  assert.match(plan[0].body, /devis signé/);
  assert.equal(plan[1].title, 'IRM · 1 heure avant');
  assert.match(plan[1].body, /10:00 – 10:45\nPense à prendre : devis signé/);
});

test('rappels d’une série : une notification par occurrence', () => {
  const now = new Date(2026, 9, 15, 11, 0);
  const trampo = ev({ id: 't', date: '2026-10-14', start: 17 * 60, repeat: 'weekly', reminders: [{ amount: 30, unit: 'min' }] });
  const plan = planReminders([trampo], now, '2026-10-15');
  assert.equal(plan.length, 4); // 21, 28 oct., 4, 11 nov. (horizon 30 jours)
  assert.equal(plan[0].at.getDate(), 21);
});

test('bilan des heures par domaine : passé, prévu, tâches non faites', () => {
  const events = [
    ev({ id: '1', category: 'travail', date: '2026-10-19', start: 9 * 60, durationMin: 120 }),                 // lun. passé : 2 h
    ev({ id: '2', category: 'sport', date: '2026-10-19', start: 18 * 60, durationMin: 60, repeat: 'daily' }), // 1 h / jour
    ev({ id: '3', category: 'travail', date: '2026-10-19', start: 14 * 60, durationMin: 90, kinds: ['tache'] }), // tâche non cochée hier : 0
    ev({ id: '4', category: 'travail', date: '2026-10-20', start: 14 * 60, durationMin: 30, kinds: ['tache'] }), // tâche aujourd'hui pas encore cochée : comptée
    ev({ id: '5', category: 'travail', date: '2026-10-22', start: 9 * 60, durationMin: 60 }),                  // jeudi : prévu
  ];
  const r = hoursByDomain(events, '2026-10-19', '2026-10-25', '2026-10-20');
  assert.deepEqual(r.travail, { done: 150, planned: 60 });
  assert.deepEqual(r.sport, { done: 120, planned: 300 });
});

test('règle du 13 nov. : tout ce qui a une heure bloque tout ce qui a une heure', () => {
  const dentist = ev({ id: 'd', start: 10 * 60, durationMin: 60 }); // rendez-vous (par défaut)
  const soiree = ev({ id: 's', start: 20 * 60, durationMin: 180, nature: 'evenement' });
  const task = ev({ id: 't', start: 10 * 60 + 15, durationMin: 30, kinds: ['tache'] });
  const list = ev({ id: 'o', start: 10 * 60, durationMin: 60, kinds: ['tache', 'objet'], items: [{ id: 'a', text: 'devis' }] });
  assert.equal(findConflict([dentist], ev({ id: 'n', start: 10 * 60 + 30 }))?.event.id, 'd'); // 2 rendez-vous
  assert.equal(findConflict([soiree], ev({ id: 'n', start: 21 * 60 }))?.event.id, 's');       // rendez-vous sur un événement
  assert.equal(findConflict([dentist], { ...soiree, start: 10 * 60 })?.event.id, 'd');         // et l'inverse
  assert.equal(findConflict([dentist], task)?.event.id, 'd');   // tâche sur rendez-vous
  assert.equal(findConflict([task], ev({ id: 'n', start: 10 * 60 }))?.event.id, 't'); // rendez-vous sur une tâche
  assert.equal(findConflict([task], list)?.event.id, 't');      // deux tâches (une liste est une tâche)
  assert.equal(findConflict([soiree], { ...task, start: 20 * 60 })?.event.id, 's'); // tâche pendant une soirée
  assert.equal(findConflict([task], { ...task, id: 'u', start: 11 * 60 }), null); // bout à bout : OK
  // Anciennes natures relues : déplacement / activité = événement, autre = rendez-vous ; elles bloquent aussi avec une heure.
  assert.equal(findConflict([ev({ id: 'j', start: 9 * 60, durationMin: 180, nature: 'deplacement' })], task)?.event.id, 'j');
});

test('toute la journée (vacances, anniversaire) : un bandeau qui ne bloque rien', () => {
  const vacances = ev({ id: 'v', date: '2026-11-02', start: null, endDate: '2026-11-08', nature: 'evenement' });
  assert.ok(occursOn(vacances, '2026-11-05'));
  assert.ok(!occursOn(vacances, '2026-11-09'));
  assert.equal(occurrencesOn([vacances], '2026-11-08').length, 1);
  const rdvPendant = ev({ id: 'r', date: '2026-11-05', start: 15 * 60, durationMin: 60 });
  assert.equal(findConflict([vacances], rdvPendant), null);                       // rendez-vous pendant les vacances
  assert.equal(findConflict([vacances], { ...rdvPendant, kinds: ['tache'] }), null); // tâche aussi
  assert.equal(findConflict([rdvPendant], vacances), null);                       // vacances posées par-dessus
  const anniv = ev({ id: 'b', date: '2026-11-05', start: null });
  assert.equal(findConflict([anniv], rdvPendant), null);
  assert.equal(findConflict([anniv], { ...anniv, id: 'b2' }), null);
});

test('événement sur plusieurs jours : un seul rappel, le premier jour', () => {
  const now = new Date(2026, 9, 21, 12, 0);
  const vacances = ev({ id: 'v', title: 'Vacances', date: '2026-10-26', start: null, endDate: '2026-10-30', reminders: [{ amount: 1, unit: 'j' }] });
  const plan = planReminders([vacances], now, '2026-10-21');
  assert.equal(plan.length, 1);
  assert.equal(plan[0].at.getDate(), 25);
});

test('objets en liste cochable : ancien texte relu, rappels seulement pour ce qui reste', async () => {
  const { itemsOf, pendingItems } = await import('./model.ts');
  const old = ev({ id: 'o', kinds: ['objet'], item: 'devis signé' });
  assert.deepEqual(itemsOf(old).map((i) => i.text), ['devis signé']);
  const courses = ev({ id: 'c', title: 'Courses', date: '2026-11-11', start: 18 * 60, kinds: ['objet'],
    items: [{ id: '1', text: 'Lait', done: true }, { id: '2', text: 'Pain' }, { id: '3', text: ' ' }], reminders: [{ amount: 30, unit: 'min' }] });
  assert.deepEqual(pendingItems(courses).map((i) => i.text), ['Pain']);
  const plan = planReminders([courses], new Date(2026, 10, 10, 8, 0), '2026-11-10');
  assert.match(plan[0].body, /Pense à prendre : Pain$/m);
  const allDone = { ...courses, items: [{ id: '1', text: 'Lait', done: true }] };
  assert.doesNotMatch(planReminders([allDone], new Date(2026, 10, 10, 8, 0), '2026-11-10')[0].body, /Pense à prendre/);
});

// ---------------- Sous-domaines ----------------

test('sous-domaines : un seul niveau, couleur du parent, parent disparu = premier niveau', () => {
  const domains: Domain[] = [
    { id: 'sport', label: 'Sport', color: '#7A4FB0' },
    { id: 'roller', label: 'Roller', color: '#000000', parent: 'sport' },
    { id: 'trampo', label: 'Trampo', color: '#000000', parent: 'sport' },
    { id: 'orphelin', label: 'Orphelin', color: '#111111', parent: 'disparu' },
  ];
  assert.deepEqual(topDomains(domains).map((d) => d.id), ['sport', 'orphelin']);
  assert.deepEqual(subDomains(domains, 'sport').map((d) => d.id), ['roller', 'trampo']);
  assert.equal(rootOf(domains, 'roller'), 'sport');
  assert.equal(rootOf(domains, 'sport'), 'sport');
  assert.equal(rootOf(domains, 'orphelin'), 'orphelin');
  assert.equal(rootOf(domains, 'inconnu'), 'inconnu');
  assert.equal(domainOf(domains, 'roller').color, '#7A4FB0');
  assert.equal(domainOf(domains, 'orphelin').color, '#111111');
});

test('heures regroupées par domaine, avec le détail des sous-domaines', () => {
  const domains: Domain[] = [
    { id: 'sport', label: 'Sport', color: '#7A4FB0' },
    { id: 'roller', label: 'Roller', color: '#7A4FB0', parent: 'sport' },
    { id: 'trampo', label: 'Trampo', color: '#7A4FB0', parent: 'sport' },
    { id: 'travail', label: 'Travail', color: '#2F63B0' },
  ];
  const report = {
    sport: { done: 30, planned: 0 },
    roller: { done: 60, planned: 30 },
    trampo: { done: 120, planned: 0 },
    travail: { done: 90, planned: 0 },
    'phone:x': { done: 15, planned: 0 },
  };
  const groups = groupHours(report, domains);
  const sport = groups.find((g) => g.id === 'sport');
  assert.deepEqual(sport, {
    id: 'sport', done: 210, planned: 30,
    subs: [
      { id: 'trampo', done: 120, planned: 0 },
      { id: 'roller', done: 60, planned: 30 },
      { id: 'sport', done: 30, planned: 0 }, // sans précision
    ],
  });
  assert.deepEqual(groups.find((g) => g.id === 'travail')?.subs, []);
  assert.deepEqual(groups.find((g) => g.id === 'phone:x'), { id: 'phone:x', done: 15, planned: 0, subs: [] });
  // sous-domaine seul (rien « sans précision »)
  assert.deepEqual(groupHours({ roller: { done: 10, planned: 0 } }, domains)[0].subs, [{ id: 'roller', done: 10, planned: 0 }]);
  assert.equal(groups.reduce((s, g) => s + g.done, 0), 315);
});

test('rappel de date butoir : un pop-up par jour, du plus ancien, jusqu’à ce qu’il soit traité ; ne bloque rien', async () => {
  const { rappelToShow, blankRappel } = await import('./model.ts');
  const impots = { ...blankRappel('2026-06-01', 'perso'), id: 'i', title: 'Impôts', butoir: '2026-06-15' };
  const velo = { ...blankRappel('2026-06-03', 'perso'), id: 'v', title: 'Révision vélo' };
  assert.equal(rappelToShow([impots, velo], '2026-05-31'), null);                // pas avant le jour
  assert.equal(rappelToShow([velo, impots], '2026-06-04')?.id, 'i');            // le plus ancien d'abord
  assert.equal(rappelToShow([{ ...impots, shownDay: '2026-06-04' }, velo], '2026-06-04')?.id, 'v'); // déjà vu aujourd'hui : le suivant
  assert.equal(rappelToShow([{ ...impots, shownDay: '2026-06-03' }], '2026-06-04')?.id, 'i');      // revient le lendemain
  assert.equal(rappelToShow([{ ...impots, handled: true }], '2026-06-04'), null);
  assert.ok(occursOn(impots, '2026-06-01') && !occursOn(impots, '2026-06-02')); // bandeau le jour du rappel seulement
  assert.equal(findConflict([impots], ev({ id: 'r', date: '2026-06-01', start: 9 * 60 })), null);
});
