@echo off
REM Script de build para Windows
REM Execute diretamente no Command Prompt ou PowerShell

echo.
echo ====================================
echo   Build App Cantina - Windows
echo ====================================
echo.

REM Verificar se npm está instalado
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] npm nao esta instalado. Por favor, instale o Node.js primeiro.
    echo Baixe em: https://nodejs.org/
    pause
    exit /b 1
)

REM Instalar dependências se necessário
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias
        pause
        exit /b 1
    )
)

REM Limpar builds anteriores
echo [INFO] Limpando builds anteriores...
if exist "dist" rmdir /s /q "dist"
if exist "release" rmdir /s /q "release"

REM Build da aplicação
echo [INFO] Compilando aplicacao...
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar aplicacao
    pause
    exit /b 1
)

echo.
echo Escolha qual versao deseja gerar:
echo 1) Windows 64-bit (.exe)
echo 2) Windows 32-bit (.exe)
echo 3) Ambas versoes
echo.
set /p choice="Opcao (1-3): "

if "%choice%"=="1" (
    echo [INFO] Gerando versao Windows 64-bit...
    call npm run dist-win
) else if "%choice%"=="2" (
    echo [INFO] Gerando versao Windows 32-bit...
    call npx electron-builder --win --ia32
) else if "%choice%"=="3" (
    echo [INFO] Gerando ambas versoes...
    call npm run dist-win
) else (
    echo [ERRO] Opcao invalida
    pause
    exit /b 1
)

if %errorlevel% equ 0 (
    echo.
    echo ====================================
    echo   BUILD CONCLUIDO COM SUCESSO!
    echo ====================================
    echo.
    echo Os executaveis estao na pasta: release\
    echo.
    dir release\*.exe /b 2>nul
    echo.
    echo Pronto para distribuicao!
    echo.
) else (
    echo [ERRO] Falha durante o build
    pause
    exit /b 1
)

pause