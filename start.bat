@echo off
chcp 65001 >nul
title LinguaFlow
cd /d "%~dp0"

echo [1/4] Kiem tra Docker...
docker info >nul 2>&1
if %errorlevel%==0 goto docker_ok
echo       Docker chua chay - dang mo Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
:wait_docker
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if not %errorlevel%==0 goto wait_docker
:docker_ok
echo       Docker OK.

echo [2/4] Khoi dong Supabase...
call npm run db:start
if not %errorlevel%==0 (
  echo.
  echo LOI: Supabase khong khoi dong duoc. Xem thong bao o tren.
  pause
  exit /b 1
)

echo [3/4] Mo trinh duyet...
start "" cmd /c "timeout /t 4 /nobreak >nul & start http://localhost:5173"

echo [4/4] Chay web (dong cua so nay hoac Ctrl+C de tat web)...
call npm run dev
