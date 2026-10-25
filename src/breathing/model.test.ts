import test from 'node:test';
import assert from 'node:assert/strict';
import { cycleSeconds, EXERCISES, formatClock, phaseAt, scaleAt } from './model.ts';

const coherence = EXERCISES.find((e) => e.id === 'coherence')!;
const carree = EXERCISES.find((e) => e.id === 'carree')!;
const quatreSeptHuit = EXERCISES.find((e) => e.id === 'quatre-sept-huit')!;

test('cohérence cardiaque : 10 s par cycle, 6 respirations par minute', () => {
  assert.equal(cycleSeconds(coherence), 10);
  assert.equal(60 / cycleSeconds(coherence), 6);
});

test('phaseAt : on passe d\'Inspire à Expire puis on recommence', () => {
  assert.equal(phaseAt(coherence, 0).phase.name, 'Inspire');
  assert.equal(phaseAt(coherence, 4.9).phase.name, 'Inspire');
  assert.equal(phaseAt(coherence, 5).phase.name, 'Expire');
  assert.equal(phaseAt(coherence, 10).phase.name, 'Inspire');
  assert.equal(phaseAt(coherence, 10).cycle, 1);
  assert.equal(phaseAt(coherence, 7).remaining, 3);
});

test('scaleAt : monte à l\'inspiration, redescend à l\'expiration', () => {
  assert.equal(scaleAt(coherence, 0), 0);
  assert.ok(Math.abs(scaleAt(coherence, 2.5) - 0.5) < 1e-9);
  assert.ok(scaleAt(coherence, 4.99) > 0.99);
  assert.ok(Math.abs(scaleAt(coherence, 7.5) - 0.5) < 1e-9);
  assert.ok(scaleAt(coherence, 9.99) < 0.01);
});

test('scaleAt : « Retiens » garde le cercle plein après inspire, vide après expire', () => {
  // 4-7-8 : inspire 0-4, retiens 4-11, expire 11-19
  assert.equal(phaseAt(quatreSeptHuit, 6).phase.name, 'Retiens');
  assert.equal(scaleAt(quatreSeptHuit, 6), 1);
  // carrée : inspire 0-4, retiens 4-8, expire 8-12, pause 12-16
  assert.equal(scaleAt(carree, 5), 1);
  assert.equal(phaseAt(carree, 13).phase.name, 'Pause');
  assert.equal(scaleAt(carree, 13), 0);
});

test('formatClock', () => {
  assert.equal(formatClock(300), '5:00');
  assert.equal(formatClock(59.2), '1:00');
  assert.equal(formatClock(0), '0:00');
});
