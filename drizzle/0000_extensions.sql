-- Extensions et fonctions utilitaires (disponibles sur Neon).
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
-- unaccent() n'est pas IMMUTABLE : ce wrapper permet de l'utiliser dans une colonne générée et un index.
CREATE OR REPLACE FUNCTION hia_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
