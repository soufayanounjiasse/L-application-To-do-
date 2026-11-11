import { defineConfig } from 'vitest/config';

// Tests unitaires (équivalent de JUnit) + couverture (équivalent de JaCoCo, via V8).
export default defineConfig({
  test: {
    include: ['tests-unitaires/**/*.test.js'],
    environment: 'node',
    reporters: ['default', 'junit'],
    outputFile: { junit: 'reports/junit-unitaires.xml' },
    coverage: {
      provider: 'v8',
      include: ['app/js/db.js', 'app/js/statistiques.js'],        // la logique métier ; app.js (DOM) est couvert par le BDD
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'reports/couverture',
      // « Quality gate » comme avec JaCoCo : la commande échoue si la couverture passe sous ces seuils.
      thresholds: { statements: 90, branches: 80, functions: 90, lines: 90 },
    },
  },
});
