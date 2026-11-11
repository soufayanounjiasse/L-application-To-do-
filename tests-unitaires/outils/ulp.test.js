import { describe, expect, test } from 'vitest';
import { distanceUlp, presqueEgalUlp, ulp } from './ulp.js';

describe('ulp (écart entre deux doubles voisins)', () => {
  test.each([
    [1, 2 ** -52],
    [-1, 2 ** -52],
    [0.5, 2 ** -53],
    [1024, 2 ** -42],
    [0, Number.MIN_VALUE],
    [Number.MAX_VALUE, 2 ** 971],
  ])('ulp(%s) = %s', (x, attendu) => {
    expect(ulp(x)).toBe(attendu);
  });

  test.each([[Infinity], [-Infinity], [NaN]])('ulp(%s) est NaN', (x) => {
    expect(ulp(x)).toBeNaN();
  });
});

describe('distanceUlp', () => {
  test('0 pour deux nombres égaux, y compris +0 et -0', () => {
    expect(distanceUlp(1.5, 1.5)).toBe(0);
    expect(distanceUlp(0, -0)).toBe(0);
  });

  test.each([
    [1, 1 + 2 ** -52, 1],
    [1, 1 + 3 * 2 ** -52, 3],
    [-1, -1 - 2 ** -52, 1],
    [-Number.MIN_VALUE, Number.MIN_VALUE, 2],           // de part et d'autre de zéro
    [0.1 + 0.2, 0.3, 1],
  ])('distanceUlp(%s, %s) = %s', (a, b, attendu) => {
    expect(distanceUlp(a, b)).toBe(attendu);
    expect(distanceUlp(b, a)).toBe(attendu);            // symétrique
  });

  test('Infinity si un des nombres est NaN', () => {
    expect(distanceUlp(NaN, 1)).toBe(Infinity);
    expect(distanceUlp(1, NaN)).toBe(Infinity);
  });
});

describe('presqueEgalUlp', () => {
  test('0.1 + 0.2 et 0.3 sont à 1 ulp, pas à 0', () => {
    expect(presqueEgalUlp(0.1 + 0.2, 0.3)).toBe(true);
    expect(presqueEgalUlp(0.1 + 0.2, 0.3, 0)).toBe(false);
  });

  test('refuse un écart de 2 ulps quand on en tolère 1', () => {
    expect(presqueEgalUlp(1, 1 + 2 * 2 ** -52, 1)).toBe(false);
    expect(presqueEgalUlp(1, 1 + 2 * 2 ** -52, 2)).toBe(true);
  });
});
