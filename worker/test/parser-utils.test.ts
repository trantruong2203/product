import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRankings, normalizeText } from '../src/utils/parser';

test('normalizeText removes punctuation and lowercases unicode text', () => {
  const value = normalizeText('  Xin\tChào, Thế-Giới!!!  ');
  assert.equal(value, 'xin chào thế giới');
});

test('extractRankings parses numbered list entries', () => {
  const text = `1. Alpha\n2) Beta\n[3] Gamma\n21. Ignored`;
  const rankings = extractRankings(text);

  assert.deepEqual(rankings, [
    { position: 1, name: 'Alpha' },
    { position: 2, name: 'Beta' },
    { position: 3, name: 'Gamma' },
  ]);
});
