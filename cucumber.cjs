// Configuration de Cucumber.js : "npm test" lance tous les scénarios de features/.
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/support/**/*.js', 'features/step_definitions/**/*.js'],
    format: [
      'pretty',
      'html:reports/cucumber.html',
      'junit:reports/junit.xml',
    ],
    formatOptions: { snippetInterface: 'async-await' },
  },
};
