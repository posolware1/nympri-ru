@echo off
setlocal EnableExtensions
cd /d "%~dp0"
chcp 65001 >nul
title NymPri RU Language Patch

set "PY="
where py >nul 2>&1
if not errorlevel 1 (
  py -3 -c "import sys; raise SystemExit(0 if sys.version_info>=(3, 0) else 1)" >nul 2>&1
  if not errorlevel 1 set "PY=py -3"
)
if not defined PY (
  where python >nul 2>&1
  if not errorlevel 1 (
    python -c "import sys; raise SystemExit(0 if sys.version_info>=(3, 0) else 1)" >nul 2>&1
    if not errorlevel 1 set "PY=python"
  )
)
if not defined PY (
  echo Python 3 was not found.
  echo Install it from https://www.python.org/downloads/
  echo and enable "Add python.exe to PATH", then run install.bat again.
  echo.
  pause
  exit /b 1
)

%PY% "%~dp0install_patch.py" %*
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" echo Install failed ^(%RC%^).
if "%~1"=="" pause
exit /b %RC%
