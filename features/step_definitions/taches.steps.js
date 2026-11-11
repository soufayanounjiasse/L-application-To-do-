const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

const pluriel = (n) => `${n} tâche${n > 1 ? 's' : ''}`;

// ------------------------------------------------------------------ préparation
Given('la tâche {string} existe dans le projet {string}', async function (titre, projet) {
  await this.ajouterTacheUI({ titre, projet });
  await expect(this.tacheLi(titre)).toBeVisible();
});

// ------------------------------------------------------------------ ajout
When("j'ajoute la tâche {string} au projet {string}", async function (titre, projet) {
  await this.ajouterTacheUI({ titre, projet });
});

When(
  "j'ajoute la tâche {string} au projet {string} avec la priorité {string} et la description {string}",
  async function (titre, projet, priorite, description) {
    await this.ajouterTacheUI({ titre, projet, priorite, description });
  }
);

When("j'ajoute la tâche {string} sans choisir de projet", async function (titre) {
  await this.page.getByTestId('titre-tache').fill(titre);
  await this.page.getByRole('button', { name: 'Ajouter la tâche' }).click();
});

// ------------------------------------------------------------------ modification
When('je commence à modifier la tâche {string}', async function (titre) {
  await this.tacheLi(titre).getByRole('button', { name: /Modifier/ }).click();
});

When('je saisis le titre {string}', async function (titre) {
  await this.page.getByTestId('titre-tache').fill(titre);
});

When("j'enregistre la modification", async function () {
  await this.enregistrerTacheUI();
});

When("j'annule la modification", async function () {
  await this.page.getByRole('button', { name: 'Annuler' }).click();
});

When('je modifie la tâche {string} avec le titre {string}', async function (titre, nouveauTitre) {
  await this.tacheLi(titre).getByRole('button', { name: /Modifier/ }).click();
  await this.remplirTacheUI({ titre: nouveauTitre });
  await this.enregistrerTacheUI();
});

When('je déplace la tâche {string} vers le projet {string}', async function (titre, projet) {
  await this.tacheLi(titre).getByRole('button', { name: /Modifier/ }).click();
  await this.remplirTacheUI({ projet });
  await this.enregistrerTacheUI();
});

When('je change la priorité de la tâche {string} en {string}', async function (titre, priorite) {
  await this.tacheLi(titre).getByRole('button', { name: /Modifier/ }).click();
  await this.remplirTacheUI({ priorite });
  await this.enregistrerTacheUI();
});

When('je termine la tâche {string}', async function (titre) {
  await this.tacheLi(titre).getByRole('checkbox').check();
});

When('je rouvre la tâche {string}', async function (titre) {
  await this.tacheLi(titre).getByRole('checkbox').uncheck();
});

When('je supprime la tâche {string}', async function (titre) {
  await this.tacheLi(titre).getByRole('button', { name: /Supprimer/ }).click();
});

// ------------------------------------------------------------------ filtres
When('je filtre les tâches par le projet {string}', async function (projet) {
  await this.page.getByTestId('filtre-projet').selectOption({ label: projet });
});

When('je filtre les tâches par le statut {string}', async function (statut) {
  await this.page.getByTestId('filtre-statut').selectOption({ label: statut });
});

When('je clique sur le projet {string}', async function (projet) {
  await this.projetLi(projet).getByTestId('projet-nom').click();
});

When("j'affiche toutes les tâches", async function () {
  await this.page.getByRole('button', { name: /Toutes les tâches/ }).click();
});

// ------------------------------------------------------------------ vérifications
Then('la liste des tâches contient {string}', async function (titre) {
  await expect.poll(() => this.titresTaches()).toContain(titre);
});

Then('la liste des tâches ne contient pas {string}', async function (titre) {
  await expect.poll(() => this.titresTaches()).not.toContain(titre);
});

Then('la liste des tâches est vide', async function () {
  await expect(this.page.getByTestId('tache')).toHaveCount(0);
});

Then('le compteur affiche {int} tâche(s)', async function (nombre) {
  await expect(this.page.getByTestId('compteur')).toHaveText(pluriel(nombre));
});

Then('la tâche {string} appartient au projet {string}', async function (titre, projet) {
  await expect(this.tacheLi(titre).getByTestId('tache-projet')).toHaveText(projet);
});

Then('la tâche {string} est à faire', async function (titre) {
  await expect(this.tacheLi(titre)).toHaveAttribute('data-statut', 'a-faire');
});

Then('la tâche {string} est terminée', async function (titre) {
  await expect(this.tacheLi(titre)).toHaveAttribute('data-statut', 'terminee');
});

Then('la tâche {string} a la priorité {string}', async function (titre, priorite) {
  await expect(this.tacheLi(titre).getByTestId('tache-priorite')).toHaveText(priorite);
});

Then('la tâche {string} a la description {string}', async function (titre, description) {
  await expect(this.tacheLi(titre).getByTestId('tache-description')).toHaveText(description);
});

Then("l'erreur de tâche {string} est affichée", async function (message) {
  await expect(this.page.getByTestId('erreur-tache')).toHaveText(message);
});

Then('le formulaire de tâche est en mode ajout', async function () {
  await expect(this.page.getByRole('button', { name: 'Ajouter la tâche' })).toBeVisible();
  await expect(this.page.getByTestId('titre-tache')).toHaveValue('');
});

Then(
  'le tableau de bord affiche {int} au total, {int} à faire et {int} terminée(s)',
  async function (total, aFaire, terminees) {
    await expect(this.page.getByTestId('stat-total')).toHaveText(String(total));
    await expect(this.page.getByTestId('stat-afaire')).toHaveText(String(aFaire));
    await expect(this.page.getByTestId('stat-terminees')).toHaveText(String(terminees));
  }
);
