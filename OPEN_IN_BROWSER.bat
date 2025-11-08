@echo off
REM FlatFund Pro - Open in Browser Script (Windows)

echo ═══════════════════════════════════════════════════════════════
echo   🚀 Starting FlatFund Pro...
echo ═══════════════════════════════════════════════════════════════
echo.

REM Check if dist folder exists
if not exist "dist" (
  echo ❌ Error: dist folder not found
  echo    Run 'npm run build' first
  pause
  exit /b 1
)

echo ✓ Found dist folder
echo.

echo ═══════════════════════════════════════════════════════════════
echo   🌐 Starting Server...
echo ═══════════════════════════════════════════════════════════════
echo.
echo Local Access:   http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

REM Start server
cd dist
npx serve -p 3000 -l

REM If serve fails, try alternative
if errorlevel 1 (
  echo.
  echo Trying alternative server...
  python -m http.server 3000
)

pause
