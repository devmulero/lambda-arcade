CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  stars INT NOT NULL DEFAULT 120,
  best_score INT NOT NULL DEFAULT 0,
  best_ante INT NOT NULL DEFAULT 1,
  runs_completed INT NOT NULL DEFAULT 0,
  equipped_skin TEXT NOT NULL DEFAULT 'purple_classic',
  equipped_acc TEXT NOT NULL DEFAULT 'coral_pack',
  equipped_theme TEXT NOT NULL DEFAULT 'sunset',
  equipped_trail TEXT NOT NULL DEFAULT 'trail_none',
  equipped_pet TEXT NOT NULL DEFAULT 'pet_none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migração segura caso a tabela já exista no seu PostgreSQL
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS equipped_trail TEXT NOT NULL DEFAULT 'trail_none',
  ADD COLUMN IF NOT EXISTS equipped_pet   TEXT NOT NULL DEFAULT 'pet_none';

CREATE TABLE IF NOT EXISTS player_unlocks (
  player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'item' | 'achievement' | 'card'
  unlock_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, category, unlock_key)
);

CREATE TABLE IF NOT EXISTS runs (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game TEXT NOT NULL,     -- 'runner' | 'hexa' | 'bastion' | 'lambdaman'
  seed INT NOT NULL,
  tier INT NOT NULL,
  score INT NOT NULL,
  hof_mult DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  code_submitted TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);