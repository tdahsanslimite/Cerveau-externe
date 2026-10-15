/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  byQuadrant, inSas, isStuck, newTask, quadrantOf, setDone, slideLabel, slideOverdue, sortTask, taskCountOn, tasksOn, whenToDay,
} from './model.ts';
import type { Task } from './model.ts';

const TODAY = '2026-10-15';
const mk = (over: Partial<Task> = {}): Task => ({ ...newTask('Tâche', '2026-10-10'), ...over });

test('les quatre quadrants d’Eisenhower', () => {
  assert.equal(quadrantOf({ important: true, urgent: true }), 'faire');
  assert.equal(quadrantOf({ important: true, urgent: false }), 'planifier');
  assert.equal(quadrantOf({ important: false, urgent: true }), 'alleger');
  assert.equal(quadrantOf({ important: false, urgent: false }), 'lacher');
  assert.equal(quadrantOf({ important: null, urgent: null }), null);
  assert.equal(quadrantOf({ important: true, urgent: null }), null);
});

test('une tâche déposée atterrit dans le sas, sans priorité ni jour', () => {
  const t = newTask('  Appeler la banque  ', TODAY);
  assert.equal(t.title, 'Appeler la banque');
  assert.equal(t.important, null);
  assert.equal(t.day, null);
  assert.deepEqual(inSas([t]).map((x) => x.id), [t.id]);
});

test('le sas ne contient que le non trié, non prévu, non terminé', () => {
  const vierge = mk({ id: 'a' });
  const triee = mk({ id: 'b', important: true, urgent: false });
  const prevue = mk({ id: 'c', day: TODAY });
  const faite = mk({ id: 'd', status: 'done' });
  const lachee = mk({ id: 'e', status: 'dropped' });
  assert.deepEqual(inSas([vierge, triee, prevue, faite, lachee]).map((x) => x.id), ['a']);
});

test('trier une tâche la sort du sas et la range dans la matrice', () => {
  const t = sortTask(mk({ id: 'a' }), true, true, TODAY);
  assert.deepEqual(inSas([t]), []);
  assert.deepEqual(byQuadrant([t], 'faire').map((x) => x.id), ['a']);
  assert.deepEqual(byQuadrant([t], 'planifier'), []);
  assert.equal(t.day, TODAY);
});

test('la matrice classe par jour prévu, « un jour » en dernier, et ignore les faites et lâchées', () => {
  const tasks = [
    mk({ id: 'sans', important: true, urgent: false, day: null }),
    mk({ id: 'tard', important: true, urgent: false, day: '2026-10-20' }),
    mk({ id: 'tot', important: true, urgent: false, day: '2026-10-16' }),
    mk({ id: 'faite', important: true, urgent: false, status: 'done' }),
    mk({ id: 'lachee', important: true, urgent: false, status: 'dropped' }),
  ];
  assert.deepEqual(byQuadrant(tasks, 'planifier').map((x) => x.id), ['tot', 'tard', 'sans']);
});

test('les tâches du jour : à faire d’abord par priorité, faites ensuite, lâchées jamais', () => {
  const tasks = [
    mk({ id: 'faite', day: TODAY, status: 'done', important: true, urgent: true }),
    mk({ id: 'plan', day: TODAY, important: true, urgent: false }),
    mk({ id: 'brute', day: TODAY }),
    mk({ id: 'faire', day: TODAY, important: true, urgent: true }),
    mk({ id: 'lachee', day: TODAY, status: 'dropped' }),
    mk({ id: 'demain', day: '2026-10-16' }),
  ];
  assert.deepEqual(tasksOn(tasks, TODAY).map((x) => x.id), ['faire', 'plan', 'brute', 'faite']);
});

test('la charge du jour compte les tâches prévues, faites ou non, pas les lâchées', () => {
  const tasks = [
    mk({ day: TODAY }),
    mk({ day: TODAY, status: 'done' }),
    mk({ day: TODAY, status: 'dropped' }),
    mk({ day: '2026-10-16' }),
    mk({ day: null }),
  ];
  assert.equal(taskCountOn(tasks, TODAY), 2);
  assert.equal(taskCountOn(tasks, '2026-10-16'), 1);
  assert.equal(taskCountOn(tasks, '2026-10-17'), 0);
});

test('glissement : une tâche non faite d’un jour passé passe à aujourd’hui', () => {
  const tasks = [
    mk({ id: 'retard', day: '2026-10-13' }),
    mk({ id: 'aujourdhui', day: TODAY }),
    mk({ id: 'futur', day: '2026-10-20' }),
    mk({ id: 'sansjour', day: null }),
    mk({ id: 'faite', day: '2026-10-13', status: 'done' }),
    mk({ id: 'lachee', day: '2026-10-13', status: 'dropped' }),
  ];
  const out = slideOverdue(tasks, TODAY);
  const get = (id: string) => out.find((t) => t.id === id) as Task;
  assert.equal(get('retard').day, TODAY);
  assert.equal(get('retard').slides, 1);
  for (const id of ['aujourdhui', 'futur', 'sansjour', 'faite', 'lachee']) {
    assert.equal(get(id).slides, 0, id);
    assert.equal(get(id).day, tasks.find((t) => t.id === id)?.day);
  }
});

test('glissement : rien à faire = même tableau, et jamais deux fois le même jour', () => {
  const calme = [mk({ day: TODAY }), mk({ day: null })];
  assert.equal(slideOverdue(calme, TODAY), calme);
  const once = slideOverdue([mk({ day: '2026-10-01' })], TODAY);
  assert.equal(slideOverdue(once, TODAY), once);
  assert.equal(once[0].slides, 1);
  // le lendemain, si elle n’est toujours pas faite, elle glisse encore
  assert.equal(slideOverdue(once, '2026-10-16')[0].slides, 2);
});

test('une tâche qui glisse beaucoup est signalée comme coincée', () => {
  assert.equal(slideLabel(mk()), null);
  assert.equal(slideLabel(mk({ slides: 1 })), 'Glissée 1 fois');
  assert.equal(slideLabel(mk({ slides: 4 })), 'Glissée 4 fois');
  assert.equal(isStuck(mk({ slides: 2 })), false);
  assert.equal(isStuck(mk({ slides: 3 })), true);
  assert.equal(isStuck(mk({ slides: 5, status: 'done' })), false);
});

test('cocher puis décocher une tâche', () => {
  const t = mk();
  const done = setDone(t, true, TODAY);
  assert.equal(done.status, 'done');
  assert.equal(done.doneAt, TODAY);
  const back = setDone(done, false, TODAY);
  assert.equal(back.status, 'todo');
  assert.equal(back.doneAt, undefined);
});

test('choix « quand » du tri guidé', () => {
  assert.equal(whenToDay('aujourdhui', TODAY), TODAY);
  assert.equal(whenToDay('demain', TODAY), '2026-10-16');
  assert.equal(whenToDay('demain', '2026-10-31'), '2026-11-01');
  assert.equal(whenToDay('un-jour', TODAY), null);
});
