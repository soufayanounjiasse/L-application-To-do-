const { When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const { expect } = require('@playwright/test');

const liste = (texte) => texte.split(',').map((s) => s.trim()).filter(Boolean);

// ------------------------------------------------------------------ navigateur : rechargement, onglets, profils
When('je recharge la page', async function () {
  await this.page.reload();
  await expect(this.page.getByTestId('statut-db')).toContainText('prête');
});

When("je ferme l'onglet et j'en ouvre un nouveau", async function () {
  await this.page.close();
  this.page = await this.contexte.newPage();                    // même profil, nouvel onglet
  await this.ouvrirApp();
});

When("j'ouvre l'application dans un nouveau profil de navigateur", async function () {
  const autre = await this.navigateur.newContext({ locale: 'fr-FR' });
  this.autresContextes.push(autre);
  this.page = await autre.newPage();                            // profil vierge : autre IndexedDB
  await this.ouvrirApp();
});

// ------------------------------------------------------------------ structure de la base
Then('la base IndexedDB {string} existe en version {int}', async function (nom, version) {
  const infos = await this.infosBase();
  assert.equal(infos.nom, nom);
  assert.equal(infos.version, version);
});

Then('elle contient les magasins {string} et {string}', async function (a, b) {
  const infos = await this.infosBase();
  assert.deepEqual(Object.keys(infos.magasins).sort(), [a, b].sort());
});

Then('le magasin {string} possède la clé {string} en auto-incrément', async function (magasin, cle) {
  const infos = await this.infosBase();
  assert.equal(infos.magasins[magasin].cle, cle);
  assert.equal(infos.magasins[magasin].autoIncrement, true);
});

Then('le magasin {string} possède les index {string} et {string}', async function (magasin, a, b) {
  const infos = await this.infosBase();
  assert.deepEqual(Object.keys(infos.magasins[magasin].index).sort(), [a, b].sort());
});

Then('le magasin {string} possède un index unique {string}', async function (magasin, index) {
  const infos = await this.infosBase();
  assert.equal(infos.magasins[magasin].index[index].unique, true);
});

// ------------------------------------------------------------------ contenu des magasins
Then('le magasin {string} contient {int} enregistrement(s)', async function (magasin, nombre) {
  await expect.poll(async () => (await this.lireMagasin(magasin)).length).toBe(nombre);
});

Then(
  'le premier enregistrement du magasin {string} a pour champ {string} la valeur {string}',
  async function (magasin, champ, valeur) {
    const enregistrements = await this.lireMagasin(magasin);
    assert.ok(enregistrements.length > 0, `le magasin ${magasin} est vide`);
    assert.equal(String(enregistrements[0][champ]), valeur);
  }
);

Then('chaque enregistrement du magasin {string} possède les champs {string}', async function (magasin, champs) {
  const enregistrements = await this.lireMagasin(magasin);
  assert.ok(enregistrements.length > 0, `le magasin ${magasin} est vide`);
  for (const enregistrement of enregistrements) {
    for (const champ of liste(champs)) {
      assert.ok(champ in enregistrement, `champ manquant : ${champ}`);
    }
  }
});

Then('les identifiants du magasin {string} sont {string}', async function (magasin, attendus) {
  const ids = (await this.lireMagasin(magasin)).map((e) => e.id).sort((x, y) => x - y);
  assert.deepEqual(ids, liste(attendus).map(Number));
});

Then("l'enregistrement de la tâche {string} référence le projet {string}", async function (titre, nomProjet) {
  const projet = (await this.lireMagasin('projects')).find((p) => p.nom === nomProjet);
  const tache = (await this.lireMagasin('tasks')).find((t) => t.titre === titre);
  assert.ok(projet, `projet introuvable : ${nomProjet}`);
  assert.ok(tache, `tâche introuvable : ${titre}`);
  assert.equal(tache.projectId, projet.id);
});

Then("l'enregistrement de la tâche {string} a pour statut {string}", async function (titre, statut) {
  await expect.poll(async () => {
    const tache = (await this.lireMagasin('tasks')).find((t) => t.titre === titre);
    return tache && tache.statut;
  }).toBe(statut);
});

Then("la date de modification de la tâche {string} n'est pas antérieure à sa date de création", async function (titre) {
  const tache = (await this.lireMagasin('tasks')).find((t) => t.titre === titre);
  assert.ok(tache, `tâche introuvable : ${titre}`);
  assert.ok(Date.parse(tache.modifieLe) >= Date.parse(tache.creeLe));
});

// ------------------------------------------------------------------ contraintes de la base
When("j'essaie d'insérer directement le projet {string} dans IndexedDB", async function (nom) {
  this.resultatInsertion = await this.insererProjetDirectement(nom);
});

Then("IndexedDB refuse l'insertion avec l'erreur {string}", async function (erreur) {
  assert.equal(this.resultatInsertion.ok, false, "l'insertion aurait dû être refusée");
  assert.equal(this.resultatInsertion.erreur, erreur);
});
