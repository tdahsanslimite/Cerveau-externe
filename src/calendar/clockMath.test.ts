/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dialAngle, pickFromDial } from './clockMath.ts';

const polar = (deg: number, r: number) => ({ x: r * Math.sin((deg * Math.PI) / 180), y: -r * Math.cos((deg * Math.PI) / 180) });

test('angle depuis midi dans le sens des aiguilles', () => {
  assert.equal(Math.round(dialAngle(0, -100)), 0);
  assert.equal(Math.round(dialAngle(100, 0)), 90);
  assert.equal(Math.round(dialAngle(0, 100)), 180);
  assert.equal(Math.round(dialAngle(-100, 0)), 270);
});

test('minutes : chaque minute du cadran se choisit', () => {
  for (let m = 0; m < 60; m++) {
    const p = polar(m * 6, 100);
    assert.equal(pickFromDial('minutes', p.x, p.y, 85), m);
  }
  const p = polar(359, 100);
  assert.equal(pickFromDial('minutes', p.x, p.y, 85), 0);
});

test('heures : extérieur 1-12, intérieur 13-00', () => {
  let p = polar(90, 104);
  assert.equal(pickFromDial('hours', p.x, p.y, 85), 3);
  p = polar(90, 66);
  assert.equal(pickFromDial('hours', p.x, p.y, 85), 15);
  p = polar(0, 104);
  assert.equal(pickFromDial('hours', p.x, p.y, 85), 12);
  p = polar(0, 66);
  assert.equal(pickFromDial('hours', p.x, p.y, 85), 0);
});

test('trop près du centre : rien n’est choisi', () => {
  assert.equal(pickFromDial('minutes', 3, 4, 85), null);
});
