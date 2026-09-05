-- 0003 — the read-only role used by the AI service (decision D-4).
--
-- Run this as a superuser once per database. The AI service connects as
-- printshop_ai, which can SELECT the two knowledge tables and nothing else.
-- A prompt-injection attempt that reaches SQL therefore achieves nothing.
--
-- Change the password before running in production.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'printshop_ai') THEN
    CREATE ROLE printshop_ai LOGIN PASSWORD 'printshop_ai';
  END IF;
END
$$;

-- Connect + see the schema, nothing more.
GRANT CONNECT ON DATABASE printshop TO printshop_ai;
GRANT USAGE ON SCHEMA public TO printshop_ai;

-- Exactly two tables, SELECT only.
GRANT SELECT ON public.knowledge_base_entries TO printshop_ai;
GRANT SELECT ON public.knowledge_base_embeddings TO printshop_ai;

-- Make sure nothing was inherited from PUBLIC or granted earlier by accident.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM printshop_ai;
GRANT SELECT ON public.knowledge_base_entries TO printshop_ai;
GRANT SELECT ON public.knowledge_base_embeddings TO printshop_ai;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM printshop_ai;
REVOKE CREATE ON SCHEMA public FROM printshop_ai;

-- Verify (expect two rows, privilege_type = SELECT):
--   SELECT table_name, privilege_type FROM information_schema.table_privileges
--    WHERE grantee = 'printshop_ai';
