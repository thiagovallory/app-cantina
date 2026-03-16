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

REM Garantir pastas de distribuicao
if not exist "distribution" mkdir "distribution"
if not exist "distribution\windows" mkdir "distribution\windows"
if not exist "distribution\macos" mkdir "distribution\macos"

REM Limpar builds anteriores
echo [INFO] Limpando builds anteriores...
if exist "dist" rmdir /s /q "dist"
del /q "distribution\windows\*" >nul 2>&1
del /q "distribution\macos\*" >nul 2>&1

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
echo 2) Windows ARM64 (.exe)
echo 3) Ambas versoes
echo.
set /p choice="Opcao (1-3): "

if "%choice%"=="1" (
    echo [INFO] Gerando versao Windows 64-bit...
    call npm run dist-win
) else if "%choice%"=="2" (
    echo [INFO] Gerando versao Windows ARM64...
    call npm run dist-win-arm64
) else if "%choice%"=="3" (
    echo [INFO] Gerando ambas versoes...
    call npm run dist-win
    if %errorlevel% neq 0 exit /b %errorlevel%
    call npm run dist-win-arm64
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
    echo Os executaveis estao em:
    echo   distribution\windows\
    echo   distribution\macos\
    echo.
    dir distribution\windows\ /b 2>nul
    echo.
    echo Pronto para distribuicao!
    echo.
) else (
    echo [ERRO] Falha durante o build
    pause
    exit /b 1
)

pause
