-- Schéma de la base de données (PostgreSQL, hébergée sur Supabase)
-- À lancer une seule fois dans Supabase : SQL Editor > New query > coller > Run

create table if not exists tickets (
  id          serial primary key,
  titre       text not null check (length(trim(titre)) > 0),
  description text,
  statut      text not null default 'ouvert'
              check (statut in ('ouvert', 'en_cours', 'resolu')),
  created_at  timestamptz not null default now()
);

-- Sécurité : bloque l'accès à la table via l'API publique de Supabase.
-- Notre backend se connecte en tant que propriétaire de la table et garde l'accès.
alter table tickets enable row level security;

-- Facultatif : deux tickets d'exemple pour tester l'affichage
insert into tickets (titre, description, statut) values
  ('Imprimante bloquée', 'L''imprimante du 2e étage affiche une erreur papier.', 'ouvert'),
  ('Accès VPN', 'Impossible de se connecter au VPN depuis chez moi.', 'en_cours');
