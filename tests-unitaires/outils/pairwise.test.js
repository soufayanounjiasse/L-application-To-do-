import { describe, expect, test } from 'vitest';
import {
  depuisSortieJenny, genererPairwise, notationJenny, pairesATotal, pairesCouvertes,
} from './pairwise.js';

const MODELES = [
  ['2 x 2 x 2', [2, 2, 2], 4],
  ['3 x 3 x 3', [3, 3, 3], 9],
  ['3 x 3 x 3 x 2', [3, 3, 3, 2], null],
  ['2 x 3 x 4', [2, 3, 4], null],
];

describe('générateur pairwise', () => {
  test.each(MODELES)('%s : toutes les paires sont couvertes avec moins de cas que l’exhaustif', (nom, tailles, attendu) => {
    const suite = genererPairwise(tailles);
    expect(pairesCouvertes(suite, tailles)).toBe(pairesATotal(tailles));
    expect(suite.length).toBeLessThan(tailles.reduce((a, b) => a * b, 1));
    const [plusGrand, secondPlusGrand] = [...tailles].sort((a, b) => b - a);
    expect(suite.length).toBeGreaterThanOrEqual(plusGrand * secondPlusGrand);   // minorant théorique
    if (attendu !== null) expect(suite).toHaveLength(attendu);
  });

  test('est déterministe', () => {
    expect(genererPairwise([3, 3, 3])).toEqual(genererPairwise([3, 3, 3]));
  });

  test('un seul paramètre : toutes ses valeurs', () => {
    expect(genererPairwise([3])).toEqual([[0], [1], [2]]);
  });

  test('pairesATotal compte les paires de valeurs', () => {
    expect(pairesATotal([3, 3, 3])).toBe(27);
    expect(pairesATotal([2, 3, 4])).toBe(26);
  });
});

describe('notation de Jenny', () => {
  test('notationJenny', () => {
    expect(notationJenny([0, 2, 1])).toBe('1a 2c 3b');
  });

  test('depuisSortieJenny lit la sortie du programme Jenny', () => {
    const texte = '1a 2c 3b\n\n 1b 2a 3a \r\n';
    expect(depuisSortieJenny(texte, 3)).toEqual([[0, 2, 1], [1, 0, 0]]);
  });
});
