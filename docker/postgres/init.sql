SELECT 'CREATE DATABASE inventory OWNER auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inventory')\gexec
SELECT 'CREATE DATABASE location OWNER auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'location')\gexec
SELECT 'CREATE DATABASE departments OWNER auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'departments')\gexec
