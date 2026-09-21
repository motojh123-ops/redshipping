#!/bin/bash
set -e

echo "host all all all trust" >> /etc/postgresql/18/main/pg_hba.conf
echo "listen_addresses = '*'" >> /etc/postgresql/18/main/postgresql.conf

service postgresql restart
service redis-server restart

su - postgres <<EOF
psql -c "CREATE USER banna_admin WITH PASSWORD 'banna_secure_pass_2026' SUPERUSER;" || true
psql -c "CREATE DATABASE banna_db OWNER banna_admin;" || true
psql -d banna_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" || true
EOF

redis-cli config set requirepass banna_redis_pass || true

echo "DATABASE AND REDIS READY!"
