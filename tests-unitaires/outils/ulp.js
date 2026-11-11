// Outils « ulp » (unit in the last place) : comparer des nombres flottants à N ulps près
// au lieu d'une tolérance fixe. JavaScript n'a pas de Math.ulp : on le fabrique avec les bits du double.
const tampon = new DataView(new ArrayBuffer(8));

function bits(x) {
  tampon.setFloat64(0, x);
  return tampon.getBigInt64(0);
}

function depuisBits(b) {
  tampon.setBigInt64(0, b);
  return tampon.getFloat64(0);
}

/** Entier qui croît avec x : deux doubles voisins ont des rangs consécutifs (+0 et -0 ont le rang 0). */
function rang(x) {
  const b = bits(x);
  return b < 0n ? -(b & 0x7fffffffffffffffn) : b;
}

/** Écart entre x et le double suivant (équivalent de Math.ulp de Java). ulp(1) = 2^-52. */
export function ulp(x) {
  if (!Number.isFinite(x)) return NaN;
  const a = Math.abs(x);
  if (a === 0) return Number.MIN_VALUE;
  const suivant = depuisBits(bits(a) + 1n);
  return suivant === Infinity ? a - depuisBits(bits(a) - 1n) : suivant - a;
}

/** Nombre de doubles qui séparent a et b (0 si égaux, Infinity si l'un est NaN). */
export function distanceUlp(a, b) {
  if (Number.isNaN(a) || Number.isNaN(b)) return Infinity;
  if (a === b) return 0;
  const ra = rang(a);
  const rb = rang(b);
  return Number(ra > rb ? ra - rb : rb - ra);
}

export function presqueEgalUlp(a, b, nombre = 1) {
  return distanceUlp(a, b) <= nombre;
}
