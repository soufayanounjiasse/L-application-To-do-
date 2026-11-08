// "Monde" Cucumber : outils partagés par toutes les définitions d'étapes.
const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

class MondeTodo extends World {
  // ---------------------------------------------------------------- application
  async ouvrirApp(page = this.page) {
    await page.goto(`${this.baseUrl}/`);
    await expect(page.getByTestId('statut-db')).toContainText('prête');
  }

  projetLi(nom) {
    return this.page.getByTestId('projet').filter({
      has: this.page.getByTestId('projet-nom').getByText(nom, { exact: true }),
    });
  }

  tacheLi(titre) {
    return this.page.getByTestId('tache').filter({
      has: this.page.getByTestId('tache-titre').getByText(titre, { exact: true }),
    });
  }

  libellesProjets() {
    return this.page.getByTestId('projet-nom').allTextContents();
  }

  titresTaches() {
    return this.page.getByTestId('tache-titre').allTextContents();
  }

  async ajouterProjetUI(nom) {
    await this.page.getByTestId('nom-projet').fill(nom);
    await this.page.getByRole('button', { name: 'Ajouter le projet' }).click();
  }

  async remplirTacheUI(champs) {
    const { titre, projet, priorite, description } = champs;
    if (titre !== undefined) await this.page.getByTestId('titre-tache').fill(titre);
    if (description !== undefined) await this.page.getByTestId('description-tache').fill(description);
    if (projet !== undefined) await this.page.getByTestId('projet-tache').selectOption({ label: projet });
    if (priorite !== undefined) await this.page.getByTestId('priorite-tache').selectOption({ value: priorite });
  }

  async ajouterTacheUI(champs) {
    await this.remplirTacheUI(champs);
    await this.page.getByRole('button', { name: 'Ajouter la tâche' }).click();
  }

  async enregistrerTacheUI() {
    await this.page.getByRole('button', { name: 'Enregistrer la tâche' }).click();
  }

  // ---------------------------------------------------------------- lecture directe d'IndexedDB
  // On interroge la base du navigateur SANS passer par le code de l'application :
  // c'est ce qui permet de vérifier ce qui est réellement stocké.
  lireMagasin(nomMagasin) {
    return this.page.evaluate((magasin) => new Promise((resolve, reject) => {
      const ouverture = indexedDB.open('todo-db');
      ouverture.onerror = () => reject(ouverture.error);
      ouverture.onsuccess = () => {
        const db = ouverture.result;
        const requete = db.transaction(magasin, 'readonly').objectStore(magasin).getAll();
        requete.onsuccess = () => { db.close(); resolve(requete.result); };
        requete.onerror = () => { db.close(); reject(requete.error); };
      };
    }), nomMagasin);
  }

  infosBase() {
    return this.page.evaluate(() => new Promise((resolve, reject) => {
      const ouverture = indexedDB.open('todo-db');
      ouverture.onerror = () => reject(ouverture.error);
      ouverture.onsuccess = () => {
        const db = ouverture.result;
        const noms = Array.from(db.objectStoreNames);
        const magasins = {};
        if (noms.length > 0) {
          const tx = db.transaction(noms, 'readonly');
          for (const nom of noms) {
            const magasin = tx.objectStore(nom);
            const index = {};
            for (const nomIndex of Array.from(magasin.indexNames)) {
              const i = magasin.index(nomIndex);
              index[nomIndex] = { unique: i.unique, cle: i.keyPath };
            }
            magasins[nom] = { cle: magasin.keyPath, autoIncrement: magasin.autoIncrement, index };
          }
        }
        const infos = { nom: db.name, version: db.version, magasins };
        db.close();
        resolve(infos);
      };
    }));
  }

  insererProjetDirectement(nom) {
    return this.page.evaluate((nomProjet) => new Promise((resolve) => {
      const ouverture = indexedDB.open('todo-db');
      ouverture.onsuccess = () => {
        const db = ouverture.result;
        const tx = db.transaction('projects', 'readwrite');
        const requete = tx.objectStore('projects').add({
          nom: nomProjet,
          nomNormalise: nomProjet.trim().toLocaleLowerCase('fr'),
          creeLe: new Date().toISOString(),
        });
        requete.onsuccess = () => resolve({ ok: true });
        requete.onerror = (evenement) => {
          evenement.preventDefault();                           // on veut seulement observer l'erreur
          resolve({ ok: false, erreur: requete.error.name });
        };
        tx.oncomplete = () => db.close();
      };
    }), nom);
  }
}

setWorldConstructor(MondeTodo);
