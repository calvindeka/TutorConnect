#!/bin/bash
# TutorConnect deployment script
# Run on the Kenyon server (10.192.145.179) by the self-hosted GitHub Actions runner.
# Pulls the latest main, rebuilds the React frontend, restarts the Express server under PM2.

set -euo pipefail

PROJECT_NAME="tutorconnect"

echo "==> Starting TutorConnect deployment $(date)"

echo "==> Pulling latest from origin/main"
git fetch --all
git reset --hard origin/main

echo "==> Installing root dependencies"
npm install --no-audit --no-fund

echo "==> Building React frontend"
cd client
npm install --no-audit --no-fund
npm run build
cd ..

echo "==> Installing backend dependencies"
cd server
npm install --no-audit --no-fund --omit=dev
cd ..

echo "==> Restarting app with PM2"
if pm2 describe "$PROJECT_NAME" >/dev/null 2>&1; then
  pm2 restart "$PROJECT_NAME"
else
  cd server
  pm2 start index.js --name "$PROJECT_NAME"
  cd ..
fi
pm2 save

echo "==> Deployment complete: http://10.192.145.179:4131"
