// Connexion à la base PostgreSQL hébergée sur Supabase.
// L'URL (avec le mot de passe) vient uniquement de la variable d'environnement DATABASE_URL :
// backend/.env en local, variables d'environnement Scalingo en production.
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL manquante : ajoute-la dans backend/.env (local) ou dans les variables Scalingo (production).'
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase impose une connexion chiffrée
  ssl: { rejectUnauthorized: false },
  // Le pooler gratuit de Supabase limite le nombre de connexions
  max: 5,
});

module.exports = pool;
