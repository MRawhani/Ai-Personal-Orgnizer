@echo off
echo Testing MongoDB Tools...
echo.

REM Test if mongodump exists and works
"C:\Users\mrawh\Downloads\mongodb-database-tools-windows-x86_64-100.13.0\mongodb-database-tools-windows-x86_64-100.13.0\bin\mongodump.exe" --version

echo.
echo If you see version info above, mongodump is working!
pause 