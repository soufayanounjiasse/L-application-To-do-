// Hooks Cucumber : serveur local + navigateur Chromium (Playwright) + contexte vierge par scénario.
const { BeforeAll, AfterAll, Before, After, setDefaultTimeout, Status } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { demarrer } = require('../../server');

setDefaultTimeout(30 * 1000);

let serveur;
let navigateur;

BeforeAll(async function () {
  serveur = await demarrer(0);                                   // port libre choisi automatiquement
  navigateur = await chromium.launch({
    headless: process.env.HEADED !== '1',                        // HEADED=1 pour voir le navigateur
    slowMo: Number(process.env.SLOWMO || 0),                     // SLOWMO=300 pour ralentir
    args: process.env.PW_NO_SANDBOX === '1' ? ['--no-sandbox'] : [],   // utile dans certains conteneurs
  });
});

AfterAll(async function () {
  if (navigateur) await navigateur.close();
  if (serveur) await serveur.arreter();
});

Before(async function (scenario) {
  this.reel = scenario.pickle.tags.some((tag) => tag.name === '@reel');
  if (this.reel && !(process.env.GITHUB_USERNAME && process.env.GITHUB_PASSWORD)) {
    return 'skipped';                                            // pas d'identifiants : scénario ignoré
  }
  this.baseUrl = serveur.url;
  this.navigateur = navigateur;
  this.autresContextes = [];
  // Un contexte neuf = un profil vierge : IndexedDB est donc vide au début de chaque scénario.
  this.contexte = await navigateur.newContext({ locale: 'fr-FR' });
  this.page = await this.contexte.newPage();
});

After(async function (scenario) {
  if (this.page && scenario.result && scenario.result.status === Status.FAILED) {
    const capture = await this.page.screenshot({ fullPage: true });
    await this.attach(capture, 'image/png');                     // la capture apparaît dans le rapport HTML
  }
  for (const contexte of [this.contexte, ...(this.autresContextes || [])]) {
    if (contexte) await contexte.close();
  }
});
