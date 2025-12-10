@echo off
setlocal enabledelayedexpansion

echo.
echo ==================================================
echo   PM - Gestion de Projets - Startup Script
echo ==================================================
echo.

:: Check if MongoDB is installed
echo [*] Checking MongoDB installation...
where mongod >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] MongoDB not found!
    echo.
    echo Install MongoDB from: https://www.mongodb.com/try/download/community
    echo Or use Chocolatey: choco install mongodb
    pause
    exit /b 1
)
echo [OK] MongoDB found

:: Create data directory
if not exist "data\db" (
    echo [*] Creating MongoDB data directory...
    mkdir data\db
    echo [OK] Created data\db
)

:: Start MongoDB
echo [*] Starting MongoDB...
start "MongoDB" mongod --dbpath "data\db" --logpath "data\mongodb.log" --logappend

timeout /t 2 /nobreak

:: Verify MongoDB is running
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MongoDB running on localhost:27017
) else (
    echo [ERROR] Failed to start MongoDB
    type data\mongodb.log
    pause
    exit /b 1
)

:: Check .env file
if not exist ".env" (
    echo [*] Creating .env file...
    (
        echo # MongoDB Connection (Local)
        echo MONGO_URL=mongodb://localhost:27017/project-manager
        echo.
        echo # JWT Secret (Change in production!^)
        echo JWT_SECRET=your-super-secret-key-min-32-chars-long-change-in-prod
        echo.
        echo # Builder API
        echo NEXT_PUBLIC_BUILDER_API_KEY=995e44ebc86544ad9c736e6e81532e68
        echo.
        echo # Node Environment
        echo NODE_ENV=development
    ) > .env
    echo [OK] Created .env
    echo [WARNING] Remember to update JWT_SECRET in production!
)

:: Install dependencies
if not exist "node_modules" (
    echo [*] Installing dependencies...
    call npm install
    echo [OK] Dependencies installed
)

:: Clear Next.js cache
if exist ".next" (
    echo [*] Cleaning Next.js cache...
    rmdir /s /q .next
)

:: Start the application
echo.
echo ==================================================
echo   Everything ready!
echo ==================================================
echo.
echo [INFO] Starting application...
echo [INFO] App URL: http://localhost:3000
echo [INFO] MongoDB: mongodb://localhost:27017/project-manager
echo.

call npm run dev

pause
