import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { io } from 'socket.io-client';
import type { Person, Product, PurchaseItem, BrandingConfig } from '../types/index';
import { PEOPLE_FIELD_ALIASES, PRODUCT_FIELD_ALIASES } from '../lib/csvSchemas';

type CSVRow = Record<string, unknown>;

interface AppContextType {
  people: Person[];
  products: Product[];
  branding: BrandingConfig;
  addPerson: (person: Omit<Person, 'id' | 'purchases'>) => Promise<void>;
  updatePerson: (id: string, updates: Partial<Person>) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addPurchase: (personId: string, items: PurchaseItem[]) => Promise<void>;
  deletePurchase: (personId: string, purchaseId: string) => Promise<void>;
  deletePurchaseItem: (personId: string, purchaseId: string, productId: string) => Promise<void>;
  updatePurchaseItemQuantity: (personId: string, purchaseId: string, productId: string, newQuantity: number) => Promise<void>;
  getPersonById: (id: string) => Person | undefined;
  getProductById: (id: string) => Product | undefined;
  getProductByBarcode: (barcode: string) => Product | undefined;
  importProductsFromCSV: (csvData: CSVRow[], onConflict: (product: CSVRow, existing: Product) => boolean) => Promise<{ imported: number; updated: number; errors: string[] }>;
  importPeopleFromCSV: (csvData: CSVRow[]) => Promise<{ imported: number; errors: string[] }>;
  encerrarAcampamento: (payload: {
    balanceAction?: 'saque' | 'missionario';
    selectedPersonIds?: string[];
    selectedBalanceAction?: 'saque' | 'missionario';
    remainingBalanceAction?: 'saque' | 'missionario';
  }) => Promise<void>;
  updateBranding: (branding: Partial<BrandingConfig>) => Promise<void>;
  exportAllData: () => Promise<string>;
  importAllData: (jsonData: string) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branding, setBranding] = useState<BrandingConfig>({
    organizationName: 'Acampamento de Jovens 2025',
    logoUrl: '/LOGO.png',
    showLogo: true,
    darkMode: false,
    missionaryGoal: 0,
    missionaryOffersResetAt: undefined
  });

  const normalizeBranding = (value?: Partial<BrandingConfig>): BrandingConfig => ({
    organizationName: value?.organizationName ?? '',
    logoUrl: value?.logoUrl ?? '',
    showLogo: value?.showLogo ?? false,
    darkMode: value?.darkMode ?? false,
    missionaryGoal: typeof value?.missionaryGoal === 'number' ? value.missionaryGoal : 0,
    missionaryOffersResetAt: typeof value?.missionaryOffersResetAt === 'string' && value.missionaryOffersResetAt
      ? value.missionaryOffersResetAt
      : undefined
  });

  const normalizePerson = (person: Person): Person => ({
    ...person,
    purchases: (person.purchases || []).map((purchase) => ({
      ...purchase,
      date: new Date(purchase.date)
    }))
  });

  const applyBootstrapData = useCallback((data: { people?: Person[]; products?: Product[]; branding?: BrandingConfig }) => {
    setPeople((data.people || []).map(normalizePerson));
    setProducts(data.products || []);
    if (data.branding) {
      setBranding(normalizeBranding(data.branding));
    }
  }, []);

  const refreshBootstrap = useCallback(async () => {
    const response = await fetch('/api/bootstrap');
    if (!response.ok) {
      throw new Error('Falha ao carregar dados iniciais');
    }

    const data = await response.json();
    applyBootstrapData(data);
    return data;
  }, [applyBootstrapData]);

  const upsertPerson = (person: Person) => {
    const normalizedPerson = normalizePerson(person);
    setPeople(prev => {
      const existingIndex = prev.findIndex(item => item.id === normalizedPerson.id);
      if (existingIndex === -1) {
        return [...prev, normalizedPerson];
      }

      return prev.map(item => (item.id === normalizedPerson.id ? normalizedPerson : item));
    });
  };

  const upsertProduct = (product: Product) => {
    setProducts(prev => {
      const existingIndex = prev.findIndex(item => item.id === product.id);
      if (existingIndex === -1) {
        return [...prev, product];
      }

      return prev.map(item => (item.id === product.id ? product : item));
    });
  };

  const getProductRowValue = (row: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }

    return undefined;
  };

  const parseOptionalDecimal = (value: unknown) => {
    if (value === undefined || value === null || String(value).trim() === '') {
      return undefined;
    }

    const parsedValue = parseFloat(String(value).replace(',', '.').replace('R$', '').trim());
    return Number.isNaN(parsedValue) ? NaN : parsedValue;
  };

  const parseOptionalInteger = (value: unknown) => {
    if (value === undefined || value === null || String(value).trim() === '') {
      return undefined;
    }

    const parsedValue = parseInt(String(value).trim(), 10);
    return Number.isNaN(parsedValue) ? NaN : parsedValue;
  };

  // Bootstrap inicial a partir da API
  useEffect(() => {
    const load = async () => {
      try {
        await refreshBootstrap();
      } catch (error) {
        console.error(error);
      }
    };

    void load();
  }, [refreshBootstrap]);

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    socket.on('bootstrap:update', (data: { people?: Person[]; products?: Product[]; branding?: BrandingConfig }) => {
      applyBootstrapData(data);
    });

    socket.on('connect_error', (error) => {
      console.error('Falha na conexão em tempo real:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [applyBootstrapData]);

  const addPerson = async (person: Omit<Person, 'id' | 'purchases'>) => {
    const response = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao adicionar pessoa');
    }

    const created: Person = await response.json();
    upsertPerson(created);
  };

  const updatePerson = async (id: string, updates: Partial<Person>) => {
    const response = await fetch(`/api/people/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao atualizar pessoa');
    }

    const updated: Person = await response.json();
    upsertPerson(updated);
  };

  const deletePerson = async (id: string) => {
    const response = await fetch(`/api/people/${id}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao excluir pessoa');
    }
    setPeople(prev => prev.filter(p => p.id !== id));
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao adicionar produto');
    }

    const created: Product = await response.json();
    upsertProduct(created);
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao atualizar produto');
    }

    const updated: Product = await response.json();
    upsertProduct(updated);
  };

  const deleteProduct = async (id: string) => {
    const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao excluir produto');
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addPurchase = async (personId: string, items: PurchaseItem[]) => {
    const response = await fetch(`/api/people/${personId}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao registrar compra');
    }

    const updatedPerson: Person = await response.json();
    setPeople(prev => prev.map(p => (p.id === personId ? normalizePerson(updatedPerson) : p)));
  };

  const deletePurchase = async (personId: string, purchaseId: string) => {
    const response = await fetch(`/api/people/${personId}/purchases/${purchaseId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao excluir compra');
    }

    const updatedPerson: Person = await response.json();
    setPeople(prev => prev.map(p => (p.id === personId ? normalizePerson(updatedPerson) : p)));
  };

  const deletePurchaseItem = async (personId: string, purchaseId: string, productId: string) => {
    const response = await fetch(`/api/people/${personId}/purchases/${purchaseId}/items/${productId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao excluir item da compra');
    }

    const updatedPerson: Person = await response.json();
    setPeople(prev => prev.map(p => (p.id === personId ? normalizePerson(updatedPerson) : p)));
  };

  const updatePurchaseItemQuantity = async (personId: string, purchaseId: string, productId: string, newQuantity: number) => {
    const response = await fetch(`/api/people/${personId}/purchases/${purchaseId}/items/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQuantity })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao atualizar quantidade do item');
    }

    const updatedPerson: Person = await response.json();
    setPeople(prev => prev.map(p => (p.id === personId ? normalizePerson(updatedPerson) : p)));
  };

  const getPersonById = (id: string) => people.find(p => p.id === id);
  const getProductById = (id: string) => products.find(p => p.id === id);
  const getProductByBarcode = (barcode: string) => products.find(p => p.barcode === barcode);

  const importProductsFromCSV = async (
    csvData: CSVRow[],
    onConflict: (product: CSVRow, existing: Product) => boolean
  ) => {
    const results = { imported: 0, updated: 0, errors: [] as string[] };
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        const nameValue = getProductRowValue(row, [...PRODUCT_FIELD_ALIASES.name]);
        const barcodeValue = getProductRowValue(row, [...PRODUCT_FIELD_ALIASES.barcode]);
        const priceValue = getProductRowValue(row, [...PRODUCT_FIELD_ALIASES.price]);
        const stockValue = getProductRowValue(row, [...PRODUCT_FIELD_ALIASES.stock]);
        const costPriceValue = getProductRowValue(row, [...PRODUCT_FIELD_ALIASES.costPrice]);
        const purchasedQuantityValue = getProductRowValue(row, [...PRODUCT_FIELD_ALIASES.purchasedQuantity]);

        // Validate required fields
        if (!nameValue || !priceValue) {
          results.errors.push(`Linha ${i + 2}: Nome e preço são obrigatórios`);
          continue;
        }

        const normalizedName = String(nameValue).trim();
        const price = parseFloat(String(priceValue).replace(',', '.').replace('R$', '').trim());
        const costPrice = parseOptionalDecimal(costPriceValue);
        const purchasedQuantity = parseOptionalInteger(purchasedQuantityValue);
        const stock = stockValue !== undefined && stockValue !== null && String(stockValue).trim() !== ''
          ? parseInt(String(stockValue).trim(), 10)
          : (purchasedQuantity ?? 0);
        
        if (isNaN(price) || price < 0) {
          results.errors.push(`Linha ${i + 2}: Preço inválido`);
          continue;
        }

        if (isNaN(stock) || stock < 0) {
          results.errors.push(`Linha ${i + 2}: Estoque inválido`);
          continue;
        }

        if (costPrice !== undefined && (isNaN(costPrice) || costPrice < 0)) {
          results.errors.push(`Linha ${i + 2}: Custo inválido`);
          continue;
        }

        if (purchasedQuantity !== undefined && (isNaN(purchasedQuantity) || purchasedQuantity < 0)) {
          results.errors.push(`Linha ${i + 2}: Quantidade comprada inválida`);
          continue;
        }

        // Check if product exists by barcode
        const normalizedBarcode = barcodeValue
          ? String(barcodeValue).trim().replace(/^="+|"+$/g, '').replace(/^='|'+$/g, '')
          : undefined;
        const existingProduct = normalizedBarcode ? getProductByBarcode(normalizedBarcode) : null;
        
        if (existingProduct) {
          // Product exists, ask for confirmation
          if (onConflict(row, existingProduct)) {
            await updateProduct(existingProduct.id, {
              name: normalizedName,
              price: price,
              stock: stock,
              barcode: normalizedBarcode,
              costPrice,
              purchasedQuantity
            });
            results.updated++;
          }
        } else {
          // New product
          await addProduct({
            name: normalizedName,
            barcode: normalizedBarcode,
            price: price,
            stock: stock,
            costPrice,
            purchasedQuantity
          });
          results.imported++;
        }
      } catch (error) {
        results.errors.push(`Linha ${i + 2}: Erro ao processar - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    return results;
  };

  const importPeopleFromCSV = async (csvData: CSVRow[]) => {
    const results = { imported: 0, errors: [] as string[] };
    
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        // Tenta encontrar o nome em diferentes possíveis campos
        const rawName = getProductRowValue(row, [...PEOPLE_FIELD_ALIASES.name]);
        const name = rawName ? String(rawName).trim() : '';
        
        if (!name) {
          results.errors.push(`Linha ${i + 2}: Nome é obrigatório`);
          continue;
        }

        // Tenta encontrar o ID em diferentes campos
        const customId = getProductRowValue(row, [...PEOPLE_FIELD_ALIASES.customId]);
        
        // Tenta encontrar o depósito em diferentes campos
        const depositValue = getProductRowValue(row, [...PEOPLE_FIELD_ALIASES.initialDeposit]) || '0';
        const initialDeposit = parseFloat(String(depositValue).replace(',', '.').replace('R$', '').trim());
        
        if (isNaN(initialDeposit) || initialDeposit < 0) {
          results.errors.push(`Linha ${i + 2}: Depósito inicial inválido`);
          continue;
        }

        // Check if person already exists by name
        const existingPerson = people.find(p => 
          p.name.toLowerCase() === name.toLowerCase()
        );
        
        if (existingPerson) {
          results.errors.push(`Linha ${i + 2}: Pessoa "${name}" já existe no sistema`);
          continue;
        }

        // Add new person
        await addPerson({
          name,
          customId: customId ? String(customId).trim() : undefined,
          initialDeposit,
          photo: undefined,
          balance: initialDeposit
        });
        results.imported++;
      } catch (error) {
        results.errors.push(`Linha ${i + 2}: Erro ao processar - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    return results;
  };

  const encerrarAcampamento = async (payload: {
    balanceAction?: 'saque' | 'missionario';
    selectedPersonIds?: string[];
    selectedBalanceAction?: 'saque' | 'missionario';
    remainingBalanceAction?: 'saque' | 'missionario';
  }) => {
    const response = await fetch('/api/encerramento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao encerrar acampamento');
    }

    const data = await response.json();
    applyBootstrapData(data);
  };

  const updateBranding = async (updates: Partial<BrandingConfig>) => {
    const response = await fetch('/api/branding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao atualizar identidade visual');
    }

    const updated: BrandingConfig = await response.json();
    setBranding(normalizeBranding(updated));
  };

  const exportAllData = async () => {
    const response = await fetch('/api/export');
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao exportar dados');
    }
    const data = await response.json();
    return JSON.stringify(data, null, 2);
  };

  const importAllData = async (jsonData: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonData
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          success: false,
          error: data.error || 'Erro ao importar dados'
        };
      }

      const bootstrapResponse = await fetch('/api/bootstrap');
      if (bootstrapResponse.ok) {
        const data = await bootstrapResponse.json();
        applyBootstrapData(data);
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao processar arquivo' 
      };
    }
  };

  return (
    <AppContext.Provider value={{
      people,
      products,
      branding,
      addPerson,
      updatePerson,
      deletePerson,
      addProduct,
      updateProduct,
      deleteProduct,
      addPurchase,
      deletePurchase,
      deletePurchaseItem,
      updatePurchaseItemQuantity,
      getPersonById,
      getProductById,
      getProductByBarcode,
      importProductsFromCSV,
      importPeopleFromCSV,
      encerrarAcampamento,
      updateBranding,
      exportAllData,
      importAllData
    }}>
      {children}
    </AppContext.Provider>
  );
};
