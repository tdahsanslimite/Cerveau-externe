import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOfTag, CHECK_EVERY_MS, newerBuild, parseBuild, shouldCheck } from './model.ts';

test('lit le numéro de fabrication d\'une étiquette', () => {
  assert.equal(buildOfTag('v1.0.57'), 57);
  assert.equal(buildOfTag('1.0.3'), 3);
  assert.equal(buildOfTag('v1.0'), null);
  assert.equal(buildOfTag(undefined), null);
});

test('numéro de l\'appli installée', () => {
  assert.equal(parseBuild('49'), 49);
  assert.equal(parseBuild(undefined), null);
  assert.equal(parseBuild(''), null);
  assert.equal(parseBuild('abc'), null);
});

test('propose seulement une version plus récente', () => {
  assert.equal(newerBuild(49, 'v1.0.57'), 57);
  assert.equal(newerBuild(57, 'v1.0.57'), null);
  assert.equal(newerBuild(60, 'v1.0.57'), null);
  assert.equal(newerBuild(null, 'v1.0.57'), null, 'en développement : jamais de bandeau');
  assert.equal(newerBuild(49, 'nimporte'), null);
});

test('vérifie au plus une fois par heure', () => {
  assert.equal(shouldCheck(null, 1000), true);
  assert.equal(shouldCheck(0, CHECK_EVERY_MS - 1), false);
  assert.equal(shouldCheck(0, CHECK_EVERY_MS), true);
});
