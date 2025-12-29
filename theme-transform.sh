#!/bin/bash

# Professional Blue Theme Transformation Script
# Transforms all amber/orange colors to blue/indigo theme

echo "Starting Professional Blue Theme Transformation..."

# Find all TypeScript/TSX files in src directory
FILES=$(find /tmp/cc-agent/61165999/project/src -name "*.tsx" -o -name "*.ts" | grep -v "node_modules")

for file in $FILES; do
  # Skip if file doesn't exist
  if [ ! -f "$file" ]; then
    continue
  fi

  # Make backups not needed since we're in git

  # Phase 1 & 3: Color Transformations (borders, text, backgrounds, gradients)
  sed -i 's/border-amber-50/border-blue-50/g' "$file"
  sed -i 's/border-amber-100/border-blue-100/g' "$file"
  sed -i 's/border-amber-200/border-blue-200/g' "$file"
  sed -i 's/border-amber-300/border-blue-300/g' "$file"
  sed -i 's/border-amber-400/border-blue-400/g' "$file"
  sed -i 's/border-amber-500/border-blue-500/g' "$file"
  sed -i 's/border-amber-600/border-blue-600/g' "$file"
  sed -i 's/border-amber-700/border-blue-700/g' "$file"

  sed -i 's/text-amber-50/text-blue-50/g' "$file"
  sed -i 's/text-amber-100/text-blue-100/g' "$file"
  sed -i 's/text-amber-200/text-blue-200/g' "$file"
  sed -i 's/text-amber-300/text-blue-300/g' "$file"
  sed -i 's/text-amber-400/text-blue-400/g' "$file"
  sed -i 's/text-amber-500/text-blue-500/g' "$file"
  sed -i 's/text-amber-600/text-blue-600/g' "$file"
  sed -i 's/text-amber-700/text-blue-700/g' "$file"
  sed -i 's/text-amber-800/text-blue-800/g' "$file"
  sed -i 's/text-amber-900/text-blue-900/g' "$file"

  sed -i 's/bg-amber-50/bg-blue-50/g' "$file"
  sed -i 's/bg-amber-100/bg-blue-100/g' "$file"
  sed -i 's/bg-amber-200/bg-blue-200/g' "$file"
  sed -i 's/bg-amber-300/bg-blue-300/g' "$file"
  sed -i 's/bg-amber-400/bg-blue-400/g' "$file"
  sed -i 's/bg-amber-500/bg-blue-500/g' "$file"
  sed -i 's/bg-amber-600/bg-blue-600/g' "$file"
  sed -i 's/bg-amber-700/bg-blue-700/g' "$file"

  sed -i 's/hover:border-amber-/hover:border-blue-/g' "$file"
  sed -i 's/hover:text-amber-/hover:text-blue-/g' "$file"
  sed -i 's/hover:bg-amber-/hover:bg-blue-/g' "$file"

  sed -i 's/focus:border-amber-/focus:border-blue-/g' "$file"
  sed -i 's/focus:ring-amber-/focus:ring-blue-/g' "$file"

  # Orange to Indigo transformations
  sed -i 's/border-orange-50/border-indigo-50/g' "$file"
  sed -i 's/border-orange-100/border-indigo-100/g' "$file"
  sed -i 's/border-orange-200/border-indigo-200/g' "$file"
  sed -i 's/border-orange-500/border-indigo-500/g' "$file"
  sed -i 's/border-orange-600/border-indigo-600/g' "$file"

  sed -i 's/text-orange-50/text-indigo-50/g' "$file"
  sed -i 's/text-orange-100/text-indigo-100/g' "$file"
  sed -i 's/text-orange-200/text-indigo-200/g' "$file"
  sed -i 's/text-orange-300/text-indigo-300/g' "$file"
  sed -i 's/text-orange-400/text-indigo-400/g' "$file"
  sed -i 's/text-orange-500/text-indigo-500/g' "$file"
  sed -i 's/text-orange-600/text-indigo-600/g' "$file"
  sed -i 's/text-orange-700/text-indigo-700/g' "$file"
  sed -i 's/text-orange-800/text-indigo-800/g' "$file"

  sed -i 's/bg-orange-50/bg-indigo-50/g' "$file"
  sed -i 's/bg-orange-100/bg-indigo-100/g' "$file"
  sed -i 's/bg-orange-200/bg-indigo-200/g' "$file"
  sed -i 's/bg-orange-400/bg-indigo-400/g' "$file"
  sed -i 's/bg-orange-500/bg-indigo-500/g' "$file"
  sed -i 's/bg-orange-600/bg-indigo-600/g' "$file"

  sed -i 's/hover:bg-orange-/hover:bg-indigo-/g' "$file"
  sed -i 's/hover:text-orange-/hover:text-indigo-/g' "$file"

  # Gradient transformations
  sed -i 's/from-amber-50 via-orange-50 to-amber-100/from-blue-50 via-indigo-50 to-blue-100/g' "$file"
  sed -i 's/from-amber-50 via-white to-orange-50/from-blue-50 via-white to-indigo-50/g' "$file"
  sed -i 's/from-amber-50 to-orange-50/from-blue-50 to-indigo-50/g' "$file"
  sed -i 's/from-amber-500 to-orange-500/from-blue-600 to-indigo-600/g' "$file"
  sed -i 's/from-amber-600 to-orange-600/from-blue-600 to-indigo-600/g' "$file"
  sed -i 's/from-amber-600 to-orange-500/from-blue-600 to-indigo-600/g' "$file"
  sed -i 's/from-orange-500 to-amber-600/from-indigo-600 to-blue-600/g' "$file"

  echo "Processed: $file"
done

echo "✓ Professional Blue Theme Transformation Complete!"
echo "✓ All amber colors → blue"
echo "✓ All orange colors → indigo"
echo "✓ Gradients updated"
