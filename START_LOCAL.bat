@echo off
cd /d "%~dp0"
echo.
echo High School Learning local preview
echo Open: http://localhost:8000/
echo Press Ctrl+C to stop.
echo.
start "" "http://localhost:8000/"
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8000
) else (
  python -m http.server 8000
)
pause
