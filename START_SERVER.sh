#!/bin/bash

echo "==========================================="
echo "  FlatFund Pro - Starting Local Server"
echo "==========================================="
echo ""

cd "$(dirname "$0")"

if [ ! -d "dist" ]; then
    echo "❌ Error: dist folder not found"
    echo "   Building application..."
    npm run build
fi

echo "✓ Found application files"
echo ""
echo "Starting server on port 5173..."
echo ""
echo "==========================================="
echo "  ACCESS YOUR APPLICATION:"
echo "==========================================="
echo ""
echo "  http://localhost:5173"
echo ""
echo "Open this URL in any browser:"
echo "  • Chrome"
echo "  • Edge"
echo "  • Firefox"
echo "  • Safari"
echo ""
echo "Press Ctrl+C to stop"
echo "==========================================="
echo ""

cd dist && python3 -m http.server 5173 2>/dev/null || python -m SimpleHTTPServer 5173
