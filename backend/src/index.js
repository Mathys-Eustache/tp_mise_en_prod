// Point d'entrée de l'API.
// En local, charge backend/.env ; en production, Scalingo fournit les variables directement.
require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const ticketsRouter = require('./tickets');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

// CORS : seules les origines listées dans CORS_ORIGIN (séparées par des virgules)
// peuvent appeler l'API depuis un navigateur. En production : l'URL Vercel.
// Le navigateur envoie l'origine sans "/" final : on retire donc les espaces, les guillemets
// et les "/" finaux saisis par erreur, sinon la comparaison exacte échoue.
const origines = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origine) => origine.trim().replace(/^["']+|["']+$/g, '').replace(/\/+$/, ''))
  .filter(Boolean);
if (origines.length === 0) {
  console.warn('CORS_ORIGIN non défini : toutes les origines sont autorisées (à éviter en production).');
} else {
  console.log(`CORS autorisé pour : ${origines.join(', ')}`);
}
app.use(cors({ origin: origines.length > 0 ? origines : '*' }));

app.use(express.json({ limit: '10kb' }));

// Vérifie que l'API répond et qu'elle arrive à joindre la base
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok' });
  } catch (err) {
    console.error('Base de données injoignable :', err.message);
    res.status(503).json({ status: 'error', database: 'injoignable' });
  }
});

app.use('/api/tickets', ticketsRouter);

// Route inconnue
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});

// Gestion des erreurs : JSON mal formé, corps trop gros, ou erreur serveur
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Le corps de la requête doit être du JSON valide.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Le corps de la requête est trop volumineux.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

app.listen(PORT, () => {
  console.log(`API démarrée sur le port ${PORT}`);
});
