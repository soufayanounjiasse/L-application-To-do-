const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

const pluriel = (n) => `${n} tâche${n > 1 ? 's' : ''}`;

Given("j'ouvre l'application de tâches", async function () {
  await this.ouvrirApp();
});

Given('le projet {string} existe', async function (nom) {
  await this.ajouterProjetUI(nom);
  await expect(this.projetLi(nom)).toBeVisible();
});

When("j'ajoute le projet {string}", async function (nom) {
  await this.ajouterProjetUI(nom);
});

When('je supprime le projet {string}', async function (nom) {
  await this.projetLi(nom).getByRole('button', { name: /Supprimer/ }).click();
});

Then('la liste des projets contient {string}', async function (nom) {
  await expect.poll(() => this.libellesProjets()).toContain(nom);
});

Then('la liste des projets est vide', async function () {
  await expect(this.page.getByTestId('projet')).toHaveCount(0);
});

Then('la liste des projets contient {int} projet(s)', async function (nombre) {
  await expect(this.page.getByTestId('projet')).toHaveCount(nombre);
});

Then('le projet {string} contient {int} tâche(s)', async function (nom, nombre) {
  await expect(this.projetLi(nom).getByTestId('projet-compteur')).toHaveText(pluriel(nombre));
});

Then("l'erreur de projet {string} est affichée", async function (message) {
  await expect(this.page.getByTestId('erreur-projet')).toHaveText(message);
});
