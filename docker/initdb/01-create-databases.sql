SELECT format('CREATE DATABASE %I', dbname)
FROM (VALUES
  ('squirrel_auth'),
  ('squirrel_users'),
  ('squirrel_workspaces'),
  ('squirrel_billing'),
  ('squirrel_logs'),
  ('squirrel_backend'),
  ('squirrel_organization')
) AS t(dbname)
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = dbname
)\gexec
