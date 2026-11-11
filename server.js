// Petit serveur statique, sans dépendance :
//   - sert l'application (dossier app/).
// Utilisation : "npm start" (http://localhost:3000) ou démarré automatiquement par les tests.
const http = require('http');
const fs = require('fs');
const path = require('path');

const RACINE_APP = path.join(__dirname, 'app');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function resoudre(urlBrute) {
  let chemin = decodeURIComponent(new URL(urlBrute, 'http://localhost').pathname);
  const base = RACINE_APP;
  if (chemin === '' || chemin.endsWith('/')) chemin += 'index.html';
  if (!path.extname(chemin)) chemin += '.html';
  const complet = path.normalize(path.join(base, chemin));
  return complet.startsWith(base) ? complet : null;           // interdit de sortir du dossier
}

function demarrer(port = 0) {
  const serveur = http.createServer((req, res) => {
    const fichier = resoudre(req.url);
    if (!fichier) { res.writeHead(403).end('Interdit'); return; }
    fs.readFile(fichier, (erreur, contenu) => {
      if (erreur) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable'); return; }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(contenu);
    });
  });
  return new Promise((resolve, reject) => {
    serveur.once('error', reject);
    serveur.listen(port, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${serveur.address().port}`,
        arreter: () => new Promise((fin) => serveur.close(() => fin())),
      });
    });
  });
}

module.exports = { demarrer };

if (require.main === module) {
  demarrer(Number(process.env.PORT) || 3000).then(({ url }) => console.log(`Application disponible sur ${url}`));
}
