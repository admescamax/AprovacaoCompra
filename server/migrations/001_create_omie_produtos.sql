-- ===================================================
-- RODAR NO SUPABASE SQL EDITOR (uma vez)
-- https://supabase.com/dashboard/project/hhgvlcskxopryqvhofsg/sql/new
-- ===================================================
CREATE TABLE IF NOT EXISTS omie_produtos (
  codigo_produto   TEXT PRIMARY KEY,
  descricao        TEXT NOT NULL,
  unidade          TEXT DEFAULT 'UN',
  valor_unitario   NUMERIC(15,2) DEFAULT 0,
  estoque_atual    NUMERIC(15,3) DEFAULT 0,
  ativo            BOOLEAN DEFAULT true,
  ncm              TEXT,
  ean              TEXT,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE omie_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY leitura_publica ON omie_produtos
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_omie_produtos_ativo    ON omie_produtos (ativo);
CREATE INDEX IF NOT EXISTS idx_omie_produtos_updated  ON omie_produtos (updated_at DESC);

-- pg_cron: sync automatico 4x por dia via Edge Function (opcional, requer extensao pg_cron + pg_net)
-- Descomentar apos deploy da Edge Function sync-omie-produtos
-- SELECT cron.schedule(
--   'sync-omie-4x',
--   '0 6,12,18,23 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://hhgvlcskxopryqvhofsg.supabase.co/functions/v1/sync-omie-produtos',
--     headers := '{"Content-Type":"application/json"}'::jsonb,
--     body := '{}'::jsonb
--   )
--   $$
-- );
