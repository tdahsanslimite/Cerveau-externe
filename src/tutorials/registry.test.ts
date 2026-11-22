/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldAutoOpen, TUTORIALS, youtubeId } from './registry.ts';
import { MODULES } from '../home/modules.ts';

test('chaque module a son entrée de tutoriel', () => {
  for (const m of MODULES) assert.ok(TUTORIALS[m.id], m.id);
});

test('identifiant YouTube : tous les formats de lien courants', () => {
  assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ?si=abc'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3s'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://drive.google.com/file/d/xyz'), null);
});

test('ouverture automatique : seulement avec une vidéo, une fois, et pas si les tutos sont masqués', () => {
  const withVideo = { url: 'https://youtu.be/dQw4w9WgXcQ', summary: '' };
  assert.equal(shouldAutoOpen(withVideo, 'journal', [], false), true);
  assert.equal(shouldAutoOpen(withVideo, 'journal', ['journal'], false), false);
  assert.equal(shouldAutoOpen(withVideo, 'journal', undefined, true), false);
  assert.equal(shouldAutoOpen({ url: '', summary: '' }, 'journal', [], false), false);
});
