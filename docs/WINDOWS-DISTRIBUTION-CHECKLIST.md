# Windows Distribution Checklist

Checklist pratica para preparar e validar a distribuicao do App Cantina no Windows.

## Estado atual

- [x] Instalador `x64` gerado com NSIS
- [x] Script para build `ARM64`
- [x] Atalho na area de trabalho e no menu Iniciar
- [x] Instalacao com escolha de diretorio
- [x] Icone `.ico` configurado no executavel e instalador
- [x] Executavel desktop usa servidor interno em vez do HTTPS de desenvolvimento
- [x] `lint` e `build` passando
- [x] Artefatos separados em `distribution/windows/`

## Validacoes recomendadas antes de distribuir

- [ ] Testar instalacao em Windows 10 x64
- [ ] Testar instalacao em Windows 11 x64
- [ ] Validar primeira abertura em maquina sem Node.js
- [ ] Validar criacao do atalho no Desktop e no Menu Iniciar
- [ ] Validar desinstalacao pelo Painel de Controle
- [ ] Validar leitura de camera no app instalado
- [ ] Validar importacao/exportacao de backup no app instalado
- [ ] Validar funcionamento offline apos instalar

## Melhorias pendentes

- [ ] Assinar o executavel para reduzir alertas do SmartScreen
- [ ] Testar em uma maquina Windows "limpa" fora do ambiente de desenvolvimento
- [ ] Revisar tamanho final do pacote e dependencia principal `vendor`

## Arquivos principais

- Instalador: `distribution/windows/App Cantina-1.0.0-x64.exe`
- Configuracao de build: `package.json`
- Shell desktop: `electron/main.cjs`
- Icone do Windows: `electron/assets/icon.ico`
- Roteiro de testes: `docs/WINDOWS-TEST-ROTEIRO.md`
