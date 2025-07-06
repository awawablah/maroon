#!/bin/bash

set -e

echo "🛠️ Compiling TypeScript..."
npx tsc

echo "🚀 Launching bot..."
node dist/bot.js
