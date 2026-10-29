#!/usr/bin/env bash

set -euo pipefail

git pull
npm install
npm run build

nginx -t
systemctl reload nginx
