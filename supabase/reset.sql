-- RESET DE DESARROLLO PARA LAVAVELOX
-- ADVERTENCIA: elimina todas las tablas, vistas, funciones, tipos y datos
-- creados en el esquema public. No ejecutar en produccion.
-- No elimina usuarios de auth.users, objetos de Storage ni el bucket
-- public-assets. Esos recursos se administran por separado.
--
-- Uso desde Supabase SQL Editor:
--   1. Ejecutar este archivo completo.
--   2. Ejecutar en orden todos los archivos de supabase/migrations/.

begin;

-- Estas politicas viven fuera de public y deben quitarse antes de recrearlas
-- desde 001_initial.sql.
drop policy if exists assets_read on storage.objects;
drop policy if exists assets_admin_insert on storage.objects;
drop policy if exists assets_admin_update on storage.objects;
drop policy if exists assets_admin_delete on storage.objects;

-- CASCADE tambien retira las tablas anteriores de supabase_realtime.
drop schema if exists public cascade;
create schema public authorization postgres;

-- Restaura los permisos habituales del esquema public de Supabase para que
-- PostgREST pueda exponer las tablas nuevas segun sus politicas RLS.
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on schema public to postgres, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on functions to postgres, service_role;

commit;

select 'Reset terminado. Ahora ejecuta en orden todos los archivos de supabase/migrations/' as siguiente_paso;
