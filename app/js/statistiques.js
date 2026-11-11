// Fonctions pures (sans DOM ni base de données) : faciles à tester unitairement.

/** « 0 tâche », « 1 tâche », « 2 tâches ». */
export const pluriel = (n) => `${n} tâche${n > 1 ? 's' : ''}`;

/** Une couleur stable par projet, déduite de son identifiant (rien à stocker en base). */
export const couleur = (id) => `hsl(${(id * 67) % 360} 75% 55%)`;

/** Part de tâches terminées, entre 0 et 1 (0 s'il n'y a aucune tâche). */
export function avancement(terminees, total) {
  if (total === 0) return 0;
  return terminees / total;
}

/** Résumé d'une liste de tâches pour le tableau de bord. */
export function resumer(taches) {
  const total = taches.length;
  const terminees = taches.filter((t) => t.statut === 'terminee').length;
  const fraction = avancement(terminees, total);
  return {
    total,
    terminees,
    aFaire: total - terminees,
    fraction,
    pourcentage: Math.round(fraction * 100),
  };
}
