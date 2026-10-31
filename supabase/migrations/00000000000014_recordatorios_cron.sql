-- Cron de recordatorios: cada minuto, pg_cron + pg_net llaman a /api/cron/reminders del
-- despliegue (Vercel Hobby solo permite crons diarios). La URL y el secreto viven en Vault,
-- no en el repositorio. Antes de aplicar esta migración, crea los dos secretos una vez:
--
--   select vault.create_secret('https://<tu-dominio>/api/cron/reminders', 'reminders_url');
--   select vault.create_secret('<mismo valor que CRON_SECRET en Vercel>', 'reminders_cron_secret');
--
-- Para cambiarlos después: vault.update_secret(id, nuevo_valor) con el id de vault.secrets.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reprogramar sin duplicar si la migración se vuelve a correr.
select cron.unschedule(jobid) from cron.job where jobname = 'send-reminders';

select cron.schedule(
  'send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);
