// Routes /api/tickets : lister, créer, changer le statut.
const express = require('express');
const pool = require('./db');

const router = express.Router();

const STATUTS = ['ouvert', 'en_cours', 'resolu'];
const TITRE_MAX = 200;
const DESCRIPTION_MAX = 2000;
const ID_MAX = 2147483647; // plus grande valeur d'une colonne SERIAL
const COLONNES = 'id, titre, description, statut, created_at';

// GET /api/tickets : tous les tickets, les plus récents en premier
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${COLONNES} FROM tickets ORDER BY created_at DESC, id DESC`
  );
  res.json(rows);
});

// POST /api/tickets : crée un ticket, avec le statut "ouvert" par défaut
router.post('/', async (req, res) => {
  const { titre, description } = req.body ?? {};

  if (typeof titre !== 'string' || titre.trim() === '') {
    return res.status(400).json({ error: 'Le titre est obligatoire.' });
  }
  if (titre.trim().length > TITRE_MAX) {
    return res
      .status(400)
      .json({ error: `Le titre ne doit pas dépasser ${TITRE_MAX} caractères.` });
  }
  if (description !== undefined && description !== null && typeof description !== 'string') {
    return res.status(400).json({ error: 'La description doit être un texte.' });
  }
  if (typeof description === 'string' && description.trim().length > DESCRIPTION_MAX) {
    return res
      .status(400)
      .json({ error: `La description ne doit pas dépasser ${DESCRIPTION_MAX} caractères.` });
  }

  // Requête paramétrée ($1, $2) : protège contre les injections SQL
  const { rows } = await pool.query(
    `INSERT INTO tickets (titre, description) VALUES ($1, $2) RETURNING ${COLONNES}`,
    [titre.trim(), description?.trim() || null]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/tickets/:id : change le statut d'un ticket
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0 || id > ID_MAX) {
    return res.status(400).json({ error: "L'identifiant doit être un entier positif." });
  }

  const { statut } = req.body ?? {};
  if (!STATUTS.includes(statut)) {
    return res
      .status(400)
      .json({ error: `Statut invalide. Valeurs possibles : ${STATUTS.join(', ')}.` });
  }

  const { rows } = await pool.query(
    `UPDATE tickets SET statut = $1 WHERE id = $2 RETURNING ${COLONNES}`,
    [statut, id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Ticket introuvable.' });
  }
  res.json(rows[0]);
});

module.exports = router;
