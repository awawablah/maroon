#!/bin/bash

set -e

echo "🛠️ Compiling TypeScript..."
npx tsc

echo "🚀 Launching bot..."
node --trace-warnings dist/bot.js
