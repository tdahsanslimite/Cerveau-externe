import test from 'node:test';
import assert from 'node:assert/strict';
import { addModel, applyModel, cleanReminders, modelSummary, needsPrompt, removeModel, suggestName } from './notifModels.ts';
import type { NotifModel } from './notifModels.ts';
import type { CalendarEvent } from './model.ts';
import { planReminders } from './reminders.ts';

const ev = (p: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e', title: 'Dentiste', date: '2026-12-02', start: 10 * 60, durationMin: 30, category: 'sante', repeat: 'none', kinds: ['rdv'], reminders: [], ...p,
});
const model = (p: Partial<NotifModel> = {}): NotifModel => ({
  id: 'm1', name: 'Rdv important', reminders: [{ amount: 1, unit: 'h' }], alert: 'alarme', color: '#D92D20', ...p,
});

test('needsPrompt : seulement un créneau créé sans notification', () => {
  assert.ok(needsPrompt(ev()));
  assert.ok(!needsPrompt(ev({ reminders: [{ amount: 30, unit: 'min' }] })));
  assert.ok(!needsPrompt(ev({ itemEveReminder: true })));
  assert.ok(!needsPrompt(ev({ kinds: ['rappel'] })), 'un rappel de date butoir n’envoie pas de notification');
  assert.ok(!needsPrompt(undefined));
});

test('applyModel : copie moments, son et couleur sur l’événement', () => {
  const e = applyModel(ev(), model());
  assert.deepEqual(e.reminders, [{ amount: 1, unit: 'h' }]);
  assert.equal(e.alert, 'alarme');
  assert.equal(e.color, '#D92D20');
  assert.equal(e.title, 'Dentiste');
});

test('cleanReminders : 3 au plus, bornés, sans doublon', () => {
  assert.deepEqual(
    cleanReminders([{ amount: 0, unit: 'min' }, { amount: 1, unit: 'min' }, { amount: 5000, unit: 'j' }, { amount: 2, unit: 'h' }, { amount: 3, unit: 'h' }]),
    [{ amount: 1, unit: 'min' }, { amount: 999, unit: 'j' }, { amount: 2, unit: 'h' }],
  );
});

test('addModel : le plus récent en premier, nom vide = nom proposé, nom pris = numéroté', () => {
  let list = addModel([], model());
  list = addModel(list, model({ id: 'm2', name: 'rdv important' }));
  assert.deepEqual(list.map((m) => m.name), ['rdv important (2)', 'Rdv important']);
  list = addModel(list, model({ id: 'm3', name: '  ' }));
  assert.equal(list[0].name, suggestName(model()));
  assert.deepEqual(removeModel(list, 'm2').map((m) => m.id), ['m3', 'm1']);
});

test('modelSummary : moments et son sur une ligne', () => {
  assert.equal(modelSummary(model({ reminders: [{ amount: 30, unit: 'min' }, { amount: 1, unit: 'j' }], alert: 'sonnerie' })), '30 min avant, 1 jour avant · Sonnerie');
});

test('la couleur de l’événement arrive jusqu’à la notification programmée', () => {
  const plan = planReminders([applyModel(ev({ alert: undefined }), model({ alert: 'sonnerie', color: '#2E8B57' }))], new Date('2026-12-01T08:00:00'), '2026-12-01');
  assert.equal(plan.length, 1);
  assert.equal(plan[0].color, '#2E8B57');
});
