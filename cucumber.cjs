// Configuration de Cucumber.js
// - "npm test"            : tous les scénarios SAUF ceux marqués @reel (connexion au vrai github.com)
// - "npm run test:reel"   : uniquement le scénario @reel (nécessite GITHUB_USERNAME et GITHUB_PASSWORD)
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/support/**/*.js', 'features/step_definitions/**/*.js'],
    tags: 'not @reel',
    format: [
      'pretty',
      'html:reports/cucumber.html',
      'junit:reports/junit.xml',
    ],
    formatOptions: { snippetInterface: 'async-await' },
  },
  reel: {
    paths: ['features/**/*.feature'],
    require: ['features/support/**/*.js', 'features/step_definitions/**/*.js'],
    tags: '@reel',
    format: ['pretty', 'html:reports/cucumber-reel.html'],
  },
};
