# 📄 Exemplos de CSV para Importação

Este diretório contém arquivos de exemplo para testar as funcionalidades de importação por CSV.

## 📦 Produtos (`produtos-exemplo.csv`)

**Formato esperado:**
- `name` - Nome do produto (obrigatório)
- `barcode` - Código de barras (opcional)
- `price` - Preço unitário (obrigatório)
- `stock` - Quantidade em estoque (opcional, padrão: 0)

**Exemplo:**
```csv
name,barcode,price,stock
Coca-Cola 350ml,7894900011517,3.50,50
Pepsi 350ml,7891991010184,3.50,30
```

## 👥 Pessoas (`pessoas-exemplo.csv`)

**Formato esperado:**
- `name` - Nome da pessoa (obrigatório)
- `customId` - ID personalizado/código (opcional)
- `initialDeposit` - Depósito inicial (opcional, padrão: 0)

**Formato alternativo aceito:**
- `deposito` em vez de `initialDeposit`
- `codigo` em vez de `customId`

**Exemplo:**
```csv
name,customId,initialDeposit
João Silva,A001,50.00
Maria Santos,A002,75.00
```

## 🚀 Como Usar

1. **No Sistema de Cantina:**
   - Clique no menu ⋮ (três pontos) no topo
   - Selecione "Importar Produtos CSV" ou "Importar Pessoas CSV"
   - Faça upload do arquivo CSV correspondente

2. **Validações:**
   - ✅ Nomes são obrigatórios
   - ✅ Preços devem ser números válidos
   - ✅ Estoques devem ser números inteiros
   - ✅ Depósitos devem ser números válidos

3. **Produtos Duplicados:**
   - Se o código de barras já existir, o sistema perguntará se deseja atualizar
   - Você pode escolher manter o existente ou atualizar com os novos dados

4. **Pessoas Duplicadas:**
   - Se o nome já existir, o sistema não importará (evita duplicatas)
   - A mensagem de erro indicará qual linha contém o conflito

## 💡 Dicas

- Use vírgula (,) como separador
- Mantenha sempre a linha de cabeçalho
- Preços podem usar ponto (.) como separador decimal
- Campos opcionais podem ficar vazios
- O sistema criará IDs únicos automaticamente

## 🛠️ Resolução de Problemas

- **"Nome é obrigatório"** → Verifique se todas as linhas têm o campo `name` preenchido
- **"Preço inválido"** → Use formato numérico (ex: 3.50, não R$ 3,50)
- **"Já existe no sistema"** → Para pessoas com mesmo nome, renomeie ou use ID personalizado
- **"Erro ao processar"** → Verifique o formato do arquivo e separadores