@echo off
echo ==========================================
echo      ESCAMAX PORTAL - INICIALIZACAO
echo ==========================================

:: 1. Verificar Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js LTS em https://nodejs.org/
    echo Apos instalar, execute este script novamente.
    pause
    exit /b
)

echo [OK] Node.js detectado.

:: 2. Configurar Servidor (Backend)
echo.
echo [1/4] Configurando Servidor Backend...
cd server
if not exist node_modules (
    echo Instalando dependencias do servidor...
    call npm install
) else (
    echo Dependencias do servidor ja instaladas.
)

:: 3. Iniciar Servidor em nova janela
echo [2/4] Iniciando Servidor Backend (Porta 3000)...
start "Escamax Backend" cmd /k "npm run dev"
cd ..

:: 4. Configurar Cliente (Frontend)
echo.
echo [3/4] Configurando Cliente Frontend...
cd client
if not exist node_modules (
    echo Instalando dependencias do cliente...
    call npm install
) else (
    echo Dependencias do cliente ja instaladas.
)

:: 5. Iniciar Cliente
echo [4/4] Iniciando Frontend (Porta 5173)...
echo.
echo O navegador deve abrir automaticamente em alguns segundos...
echo Se nao abrir, acesse: http://localhost:5173
echo.
echo Pressione CTRL+C neste terminal para encerrar o Frontend.
call npm run dev
