// Générateur de combinaisons PAIRWISE (2-wise, « all-pairs »), équivalent de l'outil Jenny :
// chaque paire de valeurs de deux paramètres différents apparaît dans au moins un test.
// Algorithme glouton déterministe : à chaque étape on retient la combinaison qui couvre le plus de paires
// encore non couvertes ; on rejoue l'algorithme avec chaque combinaison comme premier test et on garde
// la suite la plus courte.
//
// Un test = un tableau d'indices de valeurs, un par paramètre. tailles[i] = nombre de valeurs du paramètre i.

const MAX_DEPARTS = 200;

function toutesLesCombinaisons(tailles) {
  const liste = [];
  const courant = new Array(tailles.length).fill(0);
  for (;;) {
    liste.push([...courant]);
    let k = tailles.length - 1;
    while (k >= 0 && ++courant[k] === tailles[k]) {
      courant[k--] = 0;
    }
    if (k < 0) return liste;
  }
}

const cle = (i, j, vi, vj, n, maxT) => ((i * n + j) * maxT + vi) * maxT + vj;

function gain(c, couvert, n, maxT) {
  let g = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!couvert[cle(i, j, c[i], c[j], n, maxT)]) g++;
    }
  }
  return g;
}

function marquer(c, couvert, n, maxT) {
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) couvert[cle(i, j, c[i], c[j], n, maxT)] = true;
  }
}

export function pairesATotal(tailles) {
  let total = 0;
  for (let i = 0; i < tailles.length; i++) {
    for (let j = i + 1; j < tailles.length; j++) total += tailles[i] * tailles[j];
  }
  return total;
}

export function pairesCouvertes(tests, tailles) {
  const n = tailles.length;
  const maxT = Math.max(...tailles);
  const couvert = new Array(n * n * maxT * maxT).fill(false);
  for (const t of tests) marquer(t, couvert, n, maxT);
  return couvert.filter(Boolean).length;
}

function gloutonDepuis(candidats, tailles, premier) {
  const n = tailles.length;
  const maxT = Math.max(...tailles);
  const couvert = new Array(n * n * maxT * maxT).fill(false);
  let restantes = pairesATotal(tailles);
  const suite = [];
  let choisi = premier;
  for (;;) {
    restantes -= gain(choisi, couvert, n, maxT);
    marquer(choisi, couvert, n, maxT);
    suite.push(choisi);
    if (restantes === 0) return suite;
    let gainMax = -1;
    for (const c of candidats) {
      const g = gain(c, couvert, n, maxT);
      if (g > gainMax) {                                   // égalité : première combinaison (ordre lexicographique)
        gainMax = g;
        choisi = c;
      }
    }
  }
}

export function genererPairwise(tailles) {
  const candidats = toutesLesCombinaisons(tailles);
  if (tailles.length < 2) return candidats;
  const departs = candidats.length <= MAX_DEPARTS ? candidats.length : 1;
  let meilleure = null;
  for (let d = 0; d < departs; d++) {
    const suite = gloutonDepuis(candidats, tailles, candidats[d]);
    if (meilleure === null || suite.length < meilleure.length) meilleure = suite;
  }
  return meilleure;
}

/** Notation de Jenny : [0, 2, 1] -> "1a 2c 3b" (paramètre + lettre de la valeur). */
export function notationJenny(combinaison) {
  return combinaison.map((v, i) => `${i + 1}${String.fromCharCode(97 + v)}`).join(' ');
}

/**
 * Lit la sortie du vrai programme Jenny (« jenny -n2 3 3 3 > cas.txt »), une ligne par test,
 * par exemple « 1a 2c 3b ». Retourne des tableaux d'indices (a -> 0, b -> 1...).
 */
export function depuisSortieJenny(texte, nombreDeParametres) {
  return texte
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne !== '')
    .map((ligne) => {
      const test = new Array(nombreDeParametres).fill(null);
      for (const [, param, lettre] of ligne.matchAll(/(\d+)([a-z])/g)) {
        test[Number(param) - 1] = lettre.charCodeAt(0) - 97;
      }
      return test;
    });
}
