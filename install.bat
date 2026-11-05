@echo off
REM Install NymPri 0.80j RU Language Patch.
REM Usage: install.bat "C:\Games\NymPri"
setlocal
cd /d "%~dp0"
if "%~1"=="" (
  echo Usage: install.bat "C:\path\to\game"
  echo The game folder must contain www\
  exit /b 2
)
where python >nul 2>&1
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo Python not found. Manual install:
    echo   1^) Copy this patch's www\ into the game's www\ ^(overwrite^)
    echo   2^) Run: python patch_plugins_js.py "game\www\js\plugins.js"
    echo      or edit plugins.js using plugins_fragment.txt
    exit /b 1
  )
  py -3 install.py %*
  exit /b %ERRORLEVEL%
)
python install.py %*
exit /b %ERRORLEVEL%
