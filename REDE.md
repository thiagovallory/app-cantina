# 🌐 Acesso pela Rede Local e Sincronização de Dados

## 🚀 Como Executar para Acesso em Rede

### 1. Iniciar o Servidor

No computador principal, execute:
```bash
npm run dev
```

O terminal mostrará algo como:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.0.15:5173/
```

### 2. Acessar de Outros Dispositivos

Use o endereço de **Network** mostrado no terminal para acessar de:
- 📱 **Celulares**: Digite o endereço no navegador
- 💻 **Notebooks**: Use Chrome, Firefox ou Safari
- 🖥️ **Tablets**: Funciona em iPad, Android tablets, etc.

**Importante**: Todos os dispositivos devem estar na mesma rede Wi-Fi!

## 🔄 Sincronização de Dados Entre Dispositivos

Como cada dispositivo armazena seus dados localmente, você precisa sincronizar manualmente.

### 📤 Exportar Dados (Dispositivo Principal)

1. Clique no menu **⋮** (três pontos) no canto superior direito
2. Selecione **"Sincronização"**
3. Clique em **"Exportar Backup"**
4. O arquivo será baixado com nome: `cantina-backup-YYYY-MM-DD.json`

### 📥 Importar Dados (Outros Dispositivos)

1. Acesse o sistema pelo endereço de rede
2. Clique no menu **⋮** → **"Sincronização"**
3. Clique em **"Selecionar Arquivo"**
4. Escolha o arquivo de backup exportado
5. Confirme a importação

### 🔁 Sincronização Bidirecional

Para manter múltiplos dispositivos sincronizados:

1. **Defina um dispositivo principal** (onde os dados são inseridos)
2. **Exporte regularmente** do principal (ex: a cada 2 horas)
3. **Importe nos secundários** antes de usar
4. Se dados forem inseridos em dispositivo secundário, exporte e importe no principal

## 📋 Cenários de Uso

### Cenário 1: Múltiplos Caixas
```
Caixa Principal (PC) → Exporta backup → Caixa 2 (Tablet) importa
                                     → Caixa 3 (Celular) importa
```

### Cenário 2: Backup de Segurança
```
Sistema Principal → Exporta diariamente → Arquivo salvo em nuvem/pendrive
```

### Cenário 3: Consulta Móvel
```
PC (cadastros) → Exporta → Celular (apenas consulta de saldos)
```

## 🎯 Melhores Práticas

### ✅ Faça Sempre:
- **Backup antes de importar** (a importação substitui TODOS os dados)
- **Exporte ao final do dia** para ter backup completo
- **Teste a sincronização** antes do evento começar
- **Mantenha os arquivos de backup** organizados por data

### ❌ Evite:
- Importar dados antigos sobre dados novos
- Ter múltiplos dispositivos inserindo dados sem sincronização
- Esquecer de exportar após mudanças importantes
- Usar dispositivos diferentes sem sincronizar primeiro

## 🔍 Como Descobrir o IP da Máquina

### Windows (PowerShell/CMD):
```bash
ipconfig
# Procure por "Endereço IPv4"
```

### macOS/Linux:
```bash
ifconfig | grep inet
# ou
ip addr show
```

### Alternativa Visual:
- **Windows**: Configurações → Rede e Internet → WiFi → Propriedades
- **macOS**: Preferências do Sistema → Rede → WiFi → Avançado
- **Linux**: Configurações → WiFi → Detalhes da Conexão

## 🛠️ Solução de Problemas

### ❓ "Página não carrega em outro dispositivo"

1. **Verifique a rede**:
   - Ambos dispositivos na mesma rede WiFi?
   - Ping funciona entre eles?

2. **Verifique o servidor**:
   - `npm run dev` está rodando?
   - Porta 5173 não está bloqueada?

3. **Verifique o firewall**:
   - Windows Defender permite Node.js?
   - Antivírus não está bloqueando?

### ❓ "Dados não aparecem após acessar"

**Isso é normal!** Cada dispositivo tem seu próprio armazenamento local.

**Solução**: Use a Sincronização (menu → Sincronização)

### ❓ "Importação falhou"

Possíveis causas:
- Arquivo corrompido → Use um backup anterior
- Formato incorreto → Verifique se é um arquivo `.json` válido
- Navegador sem suporte → Use Chrome, Firefox ou Safari atualizados

### ❓ "Como saber se estou em rede?"

Quando acessado via rede, aparece um indicador verde **"Rede"** no topo da tela.

## 💡 Dicas Avançadas

### Servidor Dedicado
Para manter o servidor sempre ativo:
```bash
# Linux/macOS
nohup npm run dev &

# Windows (PowerShell)
Start-Process -NoNewWindow npm "run dev"
```

### Acesso Externo (Internet)
Para acessar de fora da rede local, use ferramentas como:
- **ngrok**: `ngrok http 5173`
- **localtunnel**: `lt --port 5173`
- **Tailscale**: VPN mesh network

### Automatização de Backup
Crie um script para backup automático:
```javascript
// backup-automatico.js
setInterval(() => {
  const backup = localStorage.getItem('cantina_backup');
  const timestamp = new Date().toISOString();
  // Salvar em servidor ou nuvem
}, 3600000); // A cada hora
```

## 📌 Resumo Rápido

1. **Iniciar**: `npm run dev`
2. **Acessar**: Use o IP mostrado no terminal
3. **Sincronizar**: Menu → Sincronização → Exportar/Importar
4. **Backup**: Exporte regularmente para segurança

---

💬 **Suporte**: Em caso de dúvidas, consulte a documentação principal ou abra uma issue no GitHub.