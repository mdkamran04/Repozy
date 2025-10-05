#!/usr/bin/env bash

# This script runs the database migrations before starting the application.

set -e # Exit immediately if a command exits with a non-zero status

echo "Running database migrations..."

# The 'db:migrate' script from your package.json runs 'prisma migrate deploy'
# This applies pending migrations to your target database ($DATABASE_URL)
npm run db:migrate

echo "Migrations complete. Starting Next.js application..."

# Execute the command passed to the container (e.g., 'npm start')
exec "$@"