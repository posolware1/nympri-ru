@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "LOG=%~dp0install-log.txt"
set "RC=1"
set "NP_MODE="
set "NP_PY="

REM py -3 is preferred. Any other python.exe is accepted only if it
REM actually runs Python 3 and prints NP_PY_OK. A Store alias that only
REM opens the Store does not print that line. A real Store install does,
REM even when its path contains WindowsApps.

where py >nul 2>&1
if not errorlevel 1 (
  py -3 -c "import sys; print('NP_PY_OK' if sys.version_info[0]>=3 else 'NP_PY_BAD')" 2>nul | findstr /C:"NP_PY_OK" >nul
  if not errorlevel 1 set "NP_MODE=py"
)

if defined NP_MODE goto run
where python >nul 2>&1
if errorlevel 1 goto no_python
for /f "delims=" %%F in ('where python 2^>nul') do (
  if not defined NP_PY (
    "%%F" -c "import sys; print('NP_PY_OK' if sys.version_info[0]>=3 else 'NP_PY_BAD')" 2>nul | findstr /C:"NP_PY_OK" >nul
    if not errorlevel 1 set "NP_PY=%%F"
  )
)
if not defined NP_PY goto no_python
set "NP_MODE=direct"

:run
chcp 65001 >nul
if "%NP_MODE%"=="py" goto run_py
"%NP_PY%" -u "%~dp0install.py" %*
set "RC=%ERRORLEVEL%"
goto after
:run_py
py -3 -u "%~dp0install.py" %*
set "RC=%ERRORLEVEL%"
goto after

:no_python
echo Python 3 was not found.
echo The simplest way is to install it from https://www.python.org/downloads/
echo On the first screen, tick Add python.exe to PATH.
echo If Windows opens the Store instead of running Python, Python is not installed yet.
echo.
echo Failed. Open install-log.txt next to install.bat and send that file.
>>"%LOG%" echo Python 3 was not found. A command that only opens the Microsoft Store is not a working Python. The simplest fix is https://www.python.org/downloads/ with Add python.exe to PATH.
set "RC=1"

:after
echo.
echo %cmdcmdline% | find /I "%~nx0" >nul
if not errorlevel 1 pause
exit /b %RC%
