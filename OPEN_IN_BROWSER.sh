#!/bin/bash

# FlatFund Pro - Open in Browser Script
# This script starts a local server and opens the app in your default browser

echo "═══════════════════════════════════════════════════════════════"
echo "  🚀 Starting FlatFund Pro..."
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if dist folder exists
if [ ! -d "dist" ]; then
  echo "❌ Error: dist folder not found"
  echo "   Run 'npm run build' first"
  exit 1
fi

echo "✓ Found dist folder"
echo ""

# Check if serve is installed
if ! command -v serve &> /dev/null; then
  echo "📦 Installing 'serve' package..."
  npm install -g serve
  echo ""
fi

echo "✓ Server package ready"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  🌐 Starting Server..."
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Local Access:   http://localhost:3000"
echo "Network Access: Check server output for Network URL"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Start server
cd dist
npx serve -p 3000 -l

# If serve fails, try alternative
if [ $? -ne 0 ]; then
  echo ""
  echo "Trying alternative server..."
  python3 -m http.server 3000 || python -m SimpleHTTPServer 3000
fi
