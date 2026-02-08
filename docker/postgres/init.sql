SELECT 'CREATE DATABASE inventory OWNER auth'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inventory')\gexec
