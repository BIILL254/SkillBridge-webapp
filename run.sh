#!/usr/bin/env bash
# SkillBridge startup script for fresh clones
set -e

echo "=== Starting SkillBridge ==="

# Copy .env.example if .env does not exist
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting SkillBridge API Server on port 3001..."
npm start

