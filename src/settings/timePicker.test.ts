import test from 'node:test';
import assert from 'node:assert/strict';
import { nudgeMinutes, pickerFor, setPicker, TIME_PLACES } from './timePicker.ts';

test('pickerFor : roulette par défaut, le choix de l’endroit sinon', () => {
  assert.equal(pickerFor(undefined, 'calendrier'), 'wheel');
  assert.equal(pickerFor({}, 'reveil'), 'wheel');
  assert.equal(pickerFor({ calendrier: 'clock' }, 'calendrier'), 'clock');
  assert.equal(pickerFor({ calendrier: 'clock' }, 'taches'), 'wheel');
});

test('pickerFor : le Journal reprend son ancien réglage tant qu’aucun choix n’est enregistré ici', () => {
  assert.equal(pickerFor(undefined, 'journal', 'clock'), 'clock');
  assert.equal(pickerFor({ journal: 'wheel' }, 'journal', 'clock'), 'wheel');
});

test('pickerFor : une valeur inconnue (données abîmées) retombe sur le défaut', () => {
  assert.equal(pickerFor({ reveil: 'cadran' as never }, 'reveil'), 'wheel');
});

test('setPicker : change un seul endroit', () => {
  assert.deepEqual(setPicker({ journal: 'clock' }, 'reveil', 'clock'), { journal: 'clock', reveil: 'clock' });
  assert.deepEqual(setPicker(undefined, 'taches', 'wheel'), { taches: 'wheel' });
});

test('les 4 endroits où l’on règle une heure', () => {
  assert.deepEqual(TIME_PLACES.map((p) => p.id), ['calendrier', 'taches', 'journal', 'reveil']);
});

test('nudgeMinutes : ±1 minute sans changer l’heure', () => {
  assert.equal(nudgeMinutes(7 * 60 + 30, 1), 7 * 60 + 31);
  assert.equal(nudgeMinutes(7 * 60 + 59, 1), 7 * 60);
  assert.equal(nudgeMinutes(7 * 60, -1), 7 * 60 + 59);
});
