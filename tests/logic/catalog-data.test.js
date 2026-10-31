import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { LOCAL_EXERCISES } from '../../js/data/local-exercises.js';
import { GUIDES } from '../../js/data/exercise-guides.js';
import { MEDIA_IDS, mediaFrames } from '../../js/data/exercise-media.js';

const ids = new Set(LOCAL_EXERCISES.map((e) => e.id));

test('every catalog exercise has a Hebrew guide with steps and a tip', () => {
  for (const e of LOCAL_EXERCISES) {
    const guide = GUIDES[e.id];
    assert.ok(guide, `missing guide: ${e.id}`);
    assert.ok(guide.steps.length >= 2 && guide.steps.every((s) => s.trim()), `bad steps: ${e.id}`);
    assert.ok(guide.tip.trim(), `missing tip: ${e.id}`);
  }
});

test('guides and media only refer to catalog exercises', () => {
  for (const id of Object.keys(GUIDES)) assert.ok(ids.has(id), `guide for unknown exercise: ${id}`);
  for (const id of Object.keys(MEDIA_IDS)) assert.ok(ids.has(id), `media for unknown exercise: ${id}`);
});

test('every mapped exercise has both frames on disk', async () => {
  for (const id of Object.keys(MEDIA_IDS)) {
    for (const url of mediaFrames(id)) await access(new URL(`../../${url.slice(2)}`, import.meta.url));
  }
});

test('exercises without a mapping have no frames', () => {
  assert.equal(mediaFrames('local-wall-sit'), null);
});
