import test from 'node:test';
import assert from 'node:assert/strict';
import { generateProjectPrompts } from '../src/services/promptGenerator';

test('generateProjectPrompts returns 10 ordered prompts with language and shape', () => {
  const prompts = generateProjectPrompts({
    brandName: 'Acme',
    domain: 'acme.com',
    keywords: ['sneakers', 'running', 'flat feet'],
    competitors: ['BrandX', 'BrandY'],
    language: 'en',
  });

  assert.equal(prompts.length, 10);
  assert.deepEqual(
    prompts.map((p) => p.slot),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.ok(prompts.every((p) => p.query.length > 0));
  assert.ok(prompts.every((p) => p.language === 'en'));
});

test('generateProjectPrompts excludes own brand from competitors', () => {
  const prompts = generateProjectPrompts({
    brandName: 'Acme',
    domain: 'acme.com',
    keywords: ['sneakers'],
    competitors: ['Acme', 'BrandZ'],
    language: 'en',
  });

  const comparisonQueries = prompts
    .filter((p) => p.category === 'comparison')
    .map((p) => p.query.toLowerCase());

  assert.ok(comparisonQueries.some((q) => q.includes('brandz')));
  assert.ok(comparisonQueries.every((q) => !q.includes('acme vs acme')));
});
