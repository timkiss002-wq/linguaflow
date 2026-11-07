@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Dang tat Supabase (du lieu van duoc giu nguyen)...
call npm run db:stop
echo Da tat. Ban co the tat Docker Desktop neu muon.
pause
