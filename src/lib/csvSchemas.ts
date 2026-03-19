export const PRODUCT_IMPORT_HEADERS = ['Código', 'Produto', 'Qtd Comprada', 'Custo', 'Preço'] as const;

export const PRODUCT_IMPORT_EXAMPLE = ['7894900011517', 'Coca-Cola 350ml', '48', '251.90', '7.87'] as const;

export const PRODUCT_FIELD_ALIASES = {
  barcode: ['Código', 'codigo', 'Código de Barras', 'codigo de barras', 'barcode', 'Barcode'],
  name: ['Produto', 'produto', 'Nome', 'nome', 'Product', 'product', 'Name', 'name'],
  purchasedQuantity: ['Qtd Comprada', 'qtd comprada', 'Quantidade Comprada', 'quantidade comprada', 'purchasedQuantity', 'PurchasedQuantity'],
  costPrice: ['Custo', 'custo', 'costPrice', 'CostPrice', 'cost', 'Cost', 'V. Unit.', 'v. unit.'],
  price: ['Preço', 'preço', 'price', 'Price', 'valor', 'Valor', 'Preço de Venda', 'preço de venda', 'V. Vend.', 'v. vend.'],
  stock: ['Estoque', 'estoque', 'stock', 'Stock', 'Quantidade', 'quantidade', 'Estq.', 'estq.']
} as const;

export const PEOPLE_IMPORT_HEADERS = ['ID Personalizado', 'Nome', 'Depósito Inicial'] as const;

export const PEOPLE_IMPORT_EXAMPLE = ['A001', 'João Silva', '50.00'] as const;

export const PEOPLE_FIELD_ALIASES = {
  customId: ['ID Personalizado', 'customId', 'CustomId', 'id', 'ID', 'codigo', 'Código'],
  name: ['Nome', 'nome', 'Name', 'name'],
  initialDeposit: ['Depósito Inicial', 'deposito inicial', 'initialDeposit', 'InitialDeposit', 'Saldo Atual', 'saldo atual', 'saldo', 'Saldo']
} as const;

const normalizeHeader = (value: string) => value.trim().toLowerCase();

const buildAliasSet = (groups: Record<string, readonly string[]>) => (
  new Set(Object.values(groups).flat().map(normalizeHeader))
);

const productAliasSet = buildAliasSet(PRODUCT_FIELD_ALIASES);
const peopleAliasSet = buildAliasSet(PEOPLE_FIELD_ALIASES);

export const detectCsvImportType = (headers: string[]): 'products' | 'people' | null => {
  const normalizedHeaders = headers.map(normalizeHeader).filter(Boolean);
  const productMatches = normalizedHeaders.filter((header) => productAliasSet.has(header)).length;
  const peopleMatches = normalizedHeaders.filter((header) => peopleAliasSet.has(header)).length;

  if (productMatches === 0 && peopleMatches === 0) {
    return null;
  }

  if (productMatches > peopleMatches) {
    return 'products';
  }

  if (peopleMatches > productMatches) {
    return 'people';
  }

  const hasProductPrice = normalizedHeaders.some((header) => PRODUCT_FIELD_ALIASES.price.map(normalizeHeader).includes(header));
  const hasPeopleDeposit = normalizedHeaders.some((header) => PEOPLE_FIELD_ALIASES.initialDeposit.map(normalizeHeader).includes(header));

  if (hasProductPrice && !hasPeopleDeposit) {
    return 'products';
  }

  if (hasPeopleDeposit && !hasProductPrice) {
    return 'people';
  }

  return null;
};
