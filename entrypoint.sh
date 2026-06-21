#!/bin/sh

# Remove default nginx config that listens on port 80
rm -f /etc/nginx/sites-enabled/default 2>/dev/null
ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

nginx

exec uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
