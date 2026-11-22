import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyPicker, nudgeMinutes, resolvePicker, TIME_PLACES } from './timePicker.ts';

test('resolvePicker : un seul choix pour toute l’appli, roulette par défaut', () => {
  assert.equal(resolvePicker(undefined), 'wheel');
  assert.equal(resolvePicker('clock'), 'clock');
  assert.equal(resolvePicker('wheel'), 'wheel');
  assert.equal(resolvePicker('cadran' as never), 'wheel');
});

test('legacyPicker : l’horloge choisie dans le Journal ou à un endroit devient le choix de toute l’appli', () => {
  assert.equal(legacyPicker(undefined, 'clock'), 'clock');
  assert.equal(legacyPicker({ reveil: 'clock' }, 'wheel'), 'clock');
  assert.equal(legacyPicker({ calendrier: 'wheel' }, undefined), undefined);
  assert.equal(legacyPicker(undefined, undefined), undefined);
});

test('les 4 endroits où l’on règle une heure', () => {
  assert.deepEqual(TIME_PLACES.map((p) => p.id), ['calendrier', 'taches', 'journal', 'reveil']);
});

test('nudgeMinutes : ±1 minute sans changer l’heure', () => {
  assert.equal(nudgeMinutes(7 * 60 + 30, 1), 7 * 60 + 31);
  assert.equal(nudgeMinutes(7 * 60 + 59, 1), 7 * 60);
  assert.equal(nudgeMinutes(7 * 60, -1), 7 * 60 + 59);
});
