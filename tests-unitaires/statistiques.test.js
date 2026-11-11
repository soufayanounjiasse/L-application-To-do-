import { describe, expect, test } from 'vitest';
import { avancement, couleur, pluriel, resumer } from '../app/js/statistiques.js';
import { distanceUlp } from './outils/ulp.js';

describe('pluriel', () => {
  test.each([
    [0, '0 tâche'],
    [1, '1 tâche'],
    [2, '2 tâches'],
    [10, '10 tâches'],
  ])('pluriel(%s) = « %s »', (n, attendu) => {
    expect(pluriel(n)).toBe(attendu);
  });
});

describe('couleur', () => {
  test.each([
    [0, 'hsl(0 75% 55%)'],
    [1, 'hsl(67 75% 55%)'],
    [5, 'hsl(335 75% 55%)'],
    [6, 'hsl(42 75% 55%)'],                              // 402 revient à 42 : la teinte reste dans 0-359
  ])('couleur(%s) = %s', (id, attendu) => {
    expect(couleur(id)).toBe(attendu);
  });
});

describe('avancement (comparaisons en ulps)', () => {
  test('aucune tâche : 0, sans division par zéro', () => {
    expect(avancement(0, 0)).toBe(0);
  });

  test.each([
    [0, 5, 0],
    [5, 5, 1],
    [1, 4, 0.25],
    [3, 4, 0.75],
  ])('avancement(%s, %s) = %s exactement', (terminees, total, attendu) => {
    expect(avancement(terminees, total)).toBe(attendu);
  });

  test('1/3 est à 0 ulp de la valeur arrondie de 1/3', () => {
    expect(distanceUlp(avancement(1, 3), 0.3333333333333333)).toBe(0);
  });

  test('propriété : part terminée + part restante = 1, à 2 ulps près', () => {
    for (let total = 1; total <= 60; total++) {
      for (let terminees = 0; terminees <= total; terminees++) {
        const somme = avancement(terminees, total) + avancement(total - terminees, total);
        expect(distanceUlp(somme, 1), `${terminees}/${total}`).toBeLessThanOrEqual(2);
      }
    }
  });

  test('propriété : croissant avec le nombre de tâches terminées', () => {
    for (let terminees = 1; terminees <= 20; terminees++) {
      expect(avancement(terminees, 20)).toBeGreaterThan(avancement(terminees - 1, 20));
    }
  });
});

describe('resumer', () => {
  const tache = (statut) => ({ statut });

  test('liste vide', () => {
    expect(resumer([])).toEqual({ total: 0, terminees: 0, aFaire: 0, fraction: 0, pourcentage: 0 });
  });

  test('compte les tâches à faire et terminées', () => {
    const r = resumer([tache('a-faire'), tache('terminee'), tache('terminee'), tache('a-faire'), tache('a-faire')]);
    expect(r).toMatchObject({ total: 5, terminees: 2, aFaire: 3 });
    expect(r.fraction).toBe(0.4);
    expect(r.pourcentage).toBe(40);
  });

  test.each([
    [1, 3, 33],
    [2, 3, 67],
    [1, 8, 13],                                          // 12,5 % arrondi à 13
    [3, 8, 38],                                          // 37,5 % arrondi à 38
    [8, 8, 100],
  ])('%s terminée(s) sur %s : %s %%', (terminees, total, pourcentage) => {
    const taches = Array.from({ length: total }, (_, i) => tache(i < terminees ? 'terminee' : 'a-faire'));
    expect(resumer(taches).pourcentage).toBe(pourcentage);
  });
});
