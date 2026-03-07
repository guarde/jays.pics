#!/bin/sh
# graphile-worker auto-discovers crontab file from cwd.
# NOTE: -c in graphile-worker is for connection string, NOT crontab file.
set -a
. /var/www/jays.pics/.env
set +a
unset PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD PGPASSFILE PGSSLMODE
cd /var/www/jays.pics
exec /var/www/jays.pics/node_modules/.bin/graphile-worker
