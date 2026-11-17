const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {test} = require('node:test');
const vm = require('node:vm');

// Run the actual playlist configuration/helper without the browser UI below it.
const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(0, source.indexOf('const COVER_VIDEO_DIR')), context);
const orderVideos = vm.runInContext('orderCoverVideos', context);
const names = (videos) => Array.from(videos, ([filename]) => filename);

test('every clip appears once, with fixed positions honored across shuffles', () => {
  const videos = [
    ['middle.mp4', 1.5, 2], ['first.mp4', 1, 0], ['last.mp4', 0.5, -1],
    ['a.mp4', 1], ['b.mp4', 1, null], ['c.mp4', 1],
  ];
  const variations = new Set();
  let seed = 1;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let cycle = 0; cycle < 50; cycle++) {
    const result = orderVideos(videos, random);
    assert.equal(result[0], videos[1]);
    assert.equal(result[2], videos[0]);
    assert.equal(result[5], videos[2]);
    assert.deepEqual(names(result).sort(), names(videos).sort());
    variations.add(names(result).join(','));
  }
  assert(variations.size > 1, 'unpinned clips must change order');
});

test('negative positions count back from the end', () => {
  const videos = [['last', 1, -1], ['penultimate', 1, -2], ['free', 1]];
  assert.deepEqual(names(orderVideos(videos)), ['free', 'penultimate', 'last']);
});

test('does not mutate the source configuration or clip speeds', () => {
  const videos = Object.freeze([
    Object.freeze(['a', 1.3]), Object.freeze(['b', 0.5, -1]), Object.freeze(['c', 1]),
  ]);
  const result = orderVideos(videos, () => 0);
  assert.notEqual(result, videos);
  assert.equal(result[2][1], 0.5);
  assert.deepEqual(names(videos), ['a', 'b', 'c']);
});

test('rejects invalid or conflicting fixed positions', () => {
  for (const flag of [1, -2, 0.5, '0', NaN]) {
    assert.throws(() => orderVideos([['a', 1, flag]]), /position/);
  }
  assert.throws(() => orderVideos([['a', 1, 0], ['b', 1, -2]]), /share fixed position/);
});

test('handles empty and single-clip playlists', () => {
  assert.deepEqual(names(orderVideos([])), []);
  assert.deepEqual(names(orderVideos([['a', 1, -1]])), ['a']);
});
