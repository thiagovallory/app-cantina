# Windows Test Roteiro

Roteiro rapido para validar o App Cantina em uma maquina Windows 10 ou Windows 11.

## Arquivo para instalar

- `distribution/windows/App Cantina-1.0.0-x64.exe`

## Antes de começar

- Use uma maquina Windows 10 x64 ou Windows 11 x64
- Feche outros apps que possam estar usando a camera
- Se possivel, teste em uma maquina sem Node.js e sem dependencias de desenvolvimento

## Instalacao

1. Execute `App Cantina-1.0.0-x64.exe`
2. Confirme o alerta do Windows, se aparecer
3. Escolha a pasta de instalacao
4. Conclua a instalacao
5. Verifique se o atalho foi criado na area de trabalho
6. Verifique se o app aparece no Menu Iniciar como `App Cantina`

## Primeira abertura

1. Abra o app pelo atalho do Desktop
2. Confirme que a janela abre sem tela em branco
3. Confirme que o app nao mostra erro de certificado HTTPS
4. Confirme que a interface principal carrega com Pessoas e Produtos
5. Abra o menu `App Cantina > Sobre` e confira nome e versao

## Fluxos principais

1. Cadastre uma pessoa
2. Cadastre um produto
3. Realize uma compra
4. Abra os detalhes de uma pessoa
5. Gere um relatorio CSV
6. Gere um relatorio PDF
7. Exporte um backup JSON
8. Importe o backup JSON

## Camera e scanner

1. Abra uma compra
2. Ative o scanner
3. Permita acesso a camera
4. Leia um codigo ou valide a abertura da camera
5. Feche o scanner e confirme que o app continua responsivo

## Offline

1. Feche o app
2. Desconecte a maquina da internet
3. Abra o app novamente
4. Confirme que o sistema continua funcionando localmente

## Desinstalacao

1. Abra `Configuracoes > Aplicativos` ou `Painel de Controle`
2. Desinstale `App Cantina`
3. Confirme que o atalho do Desktop foi removido
4. Confirme que o app saiu do Menu Iniciar

## Resultado esperado

- Instalacao concluida sem travar
- App abre normalmente
- Fluxos principais funcionam sem modo de desenvolvimento
- Camera abre no app instalado
- Backup e relatorios funcionam
- Desinstalacao conclui sem erro
