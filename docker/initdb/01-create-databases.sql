DO
$$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'squirrel_auth') THEN
    CREATE DATABASE squirrel_auth;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'squirrel_users') THEN
    CREATE DATABASE squirrel_users;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'squirrel_workspaces') THEN
    CREATE DATABASE squirrel_workspaces;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'squirrel_billing') THEN
    CREATE DATABASE squirrel_billing;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'squirrel_logs') THEN
    CREATE DATABASE squirrel_logs;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'squirrel_backend') THEN
    CREATE DATABASE squirrel_backend;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'squirrel_organization') THEN
    CREATE DATABASE squirrel_organization;
  END IF;
END
$$;
