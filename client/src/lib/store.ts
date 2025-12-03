import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type TransactionType = 'ingreso' | 'egreso';
export type PaymentMethod = 'Efectivo' | 'Nequi' | 'Daviplata' | 'Bolt';

export type AccountCategory = 'cajas' | 'nequi' | 'bold' | 'daviplata';
export type AccountTier = 'mayor' | 'menor';

export interface Account {
  id: string;
  storeId: string;
  name: string;
  category: AccountCategory;
  tier: AccountTier;
  initialBalance: number;
  currentBalance: number;
  includeInTotal: boolean;
}

export interface Transaction {
  id: string;
  storeId: string;
  type: TransactionType;
  amount: number;
  method: PaymentMethod;
  description: string;
  date: string;
  accountId: string;
  productId?: string;
}

export interface Transfer {
  id: string;
  storeId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  price: number;
  hasIva: boolean;
  supplier: string;
}

export interface OpeningRecord {
  id: string;
  storeId: string;
  date: string;
  cajaMayor: number;
  cajaMenor: number;
}

export const ACCOUNT_CATEGORIES: { id: AccountCategory; label: string }[] = [
  { id: 'cajas', label: 'Cajas' },
  { id: 'nequi', label: 'Nequi' },
  { id: 'bold', label: 'Bold' },
  { id: 'daviplata', label: 'Daviplata' },
];

export const DEFAULT_ACCOUNTS: { category: AccountCategory; tier: AccountTier; name: string }[] = [
  { category: 'cajas', tier: 'mayor', name: 'Caja Mayor' },
  { category: 'cajas', tier: 'menor', name: 'Caja Menor' },
  { category: 'nequi', tier: 'mayor', name: 'Caja Mayor Nequi' },
  { category: 'nequi', tier: 'menor', name: 'Caja Menor Nequi' },
  { category: 'bold', tier: 'mayor', name: 'Caja Mayor Bold' },
  { category: 'bold', tier: 'menor', name: 'Caja Menor Bold' },
  { category: 'daviplata', tier: 'mayor', name: 'Caja Mayor Daviplata' },
  { category: 'daviplata', tier: 'menor', name: 'Caja Menor Daviplata' },
];

const ADMIN_PASSWORD = '1234';

interface AppState {
  isAuthenticated: boolean;
  currentStore: string | null;
  login: (storeName: string) => boolean;
  logout: () => void;
  validateAdminPassword: (password: string) => boolean;
  
  lastOpeningDate: string | null;
  
  accounts: Account[];
  getStoreAccounts: () => Account[];
  getAccountsByCategory: (category: AccountCategory) => Account[];
  initializeDefaultAccounts: () => void;
  updateAccountBalance: (id: string, initialBalance: number) => void;
  
  transactions: Transaction[];
  getStoreTransactions: () => Transaction[];
  getTodayTransactions: () => Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'storeId'>) => void;
  updateTransaction: (id: string, transaction: Partial<Omit<Transaction, 'id' | 'storeId'>>) => void;
  deleteTransaction: (id: string) => void;
  
  transfers: Transfer[];
  getStoreTransfers: () => Transfer[];
  addTransfer: (fromAccountId: string, toAccountId: string, amount: number, note: string) => { success: boolean; error?: string };
  
  products: Product[];
  getStoreProducts: () => Product[];
  addProduct: (product: Omit<Product, 'id' | 'storeId'>) => void;
  updateProduct: (id: string, product: Partial<Omit<Product, 'id' | 'storeId'>>) => void;
  deleteProduct: (id: string) => void;
  
  openings: OpeningRecord[];
  getStoreOpenings: () => OpeningRecord[];
  addOpening: (cajaMayor: number, cajaMenor: number) => void;
  
  reset: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentStore: null,
      lastOpeningDate: null,
      
      login: (storeName) => {
        set({ isAuthenticated: true, currentStore: storeName });
        setTimeout(() => get().initializeDefaultAccounts(), 0);
        return true;
      },
      logout: () => set({ isAuthenticated: false, currentStore: null }),
      
      validateAdminPassword: (password) => {
        return password === ADMIN_PASSWORD;
      },
      
      accounts: [],
      getStoreAccounts: () => {
        const { accounts, currentStore } = get();
        if (!currentStore) return [];
        return accounts.filter(a => a.storeId === currentStore);
      },
      getAccountsByCategory: (category) => {
        const { accounts, currentStore } = get();
        if (!currentStore) return [];
        return accounts.filter(a => a.storeId === currentStore && a.category === category);
      },
      initializeDefaultAccounts: () => {
        const { currentStore, accounts } = get();
        if (!currentStore) return;
        
        const storeAccounts = accounts.filter(a => a.storeId === currentStore);
        
        const existingCombos = new Set(
          storeAccounts.map(a => `${a.category}-${a.tier}`)
        );
        
        const newAccounts: Account[] = [];
        
        DEFAULT_ACCOUNTS.forEach(({ category, tier, name }) => {
          const key = `${category}-${tier}`;
          if (!existingCombos.has(key)) {
            newAccounts.push({
              id: nanoid(),
              storeId: currentStore,
              name,
              category,
              tier,
              initialBalance: 0,
              currentBalance: 0,
              includeInTotal: true,
            });
          }
        });
        
        if (newAccounts.length > 0) {
          set((state) => ({ accounts: [...state.accounts, ...newAccounts] }));
        }
      },
      updateAccountBalance: (id, initialBalance) => {
        set((state) => {
          const oldAccount = state.accounts.find(a => a.id === id);
          if (!oldAccount) return state;

          const balanceDiff = initialBalance - oldAccount.initialBalance;
          
          const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === id) {
              return {
                ...acc,
                initialBalance,
                currentBalance: acc.currentBalance + balanceDiff,
              };
            }
            return acc;
          });
          
          return { accounts: updatedAccounts };
        });
      },
      
      transactions: [],
      getStoreTransactions: () => {
        const { transactions, currentStore } = get();
        if (!currentStore) return [];
        return transactions.filter(t => t.storeId === currentStore);
      },
      getTodayTransactions: () => {
        const { transactions, currentStore, lastOpeningDate } = get();
        if (!currentStore) return [];
        
        const storeTransactions = transactions.filter(t => t.storeId === currentStore);
        
        if (!lastOpeningDate) return storeTransactions;
        
        const lastOpeningTime = new Date(lastOpeningDate).getTime();
        return storeTransactions.filter(t => new Date(t.date).getTime() > lastOpeningTime);
      },
      addTransaction: (transactionData) => {
        const { currentStore } = get();
        if (!currentStore) return;

        const newTransaction: Transaction = { 
          ...transactionData, 
          id: nanoid(),
          storeId: currentStore
        };
        
        set((state) => {
          const updatedTransactions = [...state.transactions, newTransaction];
          
          const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === transactionData.accountId) {
              const multiplier = transactionData.type === 'ingreso' ? 1 : -1;
              return {
                ...acc,
                currentBalance: acc.currentBalance + (transactionData.amount * multiplier)
              };
            }
            return acc;
          });
          
          return {
            transactions: updatedTransactions,
            accounts: updatedAccounts
          };
        });
      },
      updateTransaction: (id, transactionData) => {
        set((state) => {
          const oldTx = state.transactions.find(t => t.id === id);
          if (!oldTx) return state;

          let accounts = state.accounts.map(acc => {
             if (acc.id === oldTx.accountId) {
               const multiplier = oldTx.type === 'ingreso' ? -1 : 1; 
               return { ...acc, currentBalance: acc.currentBalance + (oldTx.amount * multiplier) };
             }
             return acc;
          });
          
          const newTx = { ...oldTx, ...transactionData };
          
          accounts = accounts.map(acc => {
             if (acc.id === newTx.accountId) {
               const multiplier = newTx.type === 'ingreso' ? 1 : -1; 
               return { ...acc, currentBalance: acc.currentBalance + (newTx.amount * multiplier) };
             }
             return acc;
          });

          const updatedTransactions = state.transactions.map(t => t.id === id ? newTx : t);

          return {
            transactions: updatedTransactions,
            accounts: accounts
          };
        });
      },
      deleteTransaction: (id) => {
        set((state) => {
          const txToDelete = state.transactions.find(t => t.id === id);
          if (!txToDelete) return state;
          
          const updatedTransactions = state.transactions.filter(t => t.id !== id);
          
          const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === txToDelete.accountId) {
              const multiplier = txToDelete.type === 'ingreso' ? -1 : 1;
              return {
                ...acc,
                currentBalance: acc.currentBalance + (txToDelete.amount * multiplier)
              };
            }
            return acc;
          });
          
          return {
            transactions: updatedTransactions,
            accounts: updatedAccounts
          };
        });
      },
      
      transfers: [],
      getStoreTransfers: () => {
        const { transfers, currentStore } = get();
        if (!currentStore) return [];
        return transfers.filter(t => t.storeId === currentStore);
      },
      addTransfer: (fromAccountId, toAccountId, amount, note) => {
        const { currentStore } = get();
        if (!currentStore) {
          return { success: false, error: 'No hay tienda activa' };
        }
        
        if (amount <= 0) {
          return { success: false, error: 'El monto debe ser mayor a 0' };
        }
        
        if (fromAccountId === toAccountId) {
          return { success: false, error: 'Las cuentas de origen y destino deben ser diferentes' };
        }
        
        const state = get();
        const fromAccount = state.accounts.find(a => a.id === fromAccountId);
        const toAccount = state.accounts.find(a => a.id === toAccountId);
        
        if (!fromAccount) {
          return { success: false, error: 'Cuenta de origen no encontrada' };
        }
        
        if (!toAccount) {
          return { success: false, error: 'Cuenta de destino no encontrada' };
        }
        
        if (fromAccount.currentBalance < amount) {
          return { success: false, error: 'Fondos insuficientes en la cuenta de origen' };
        }
        
        const newTransfer: Transfer = {
          id: nanoid(),
          storeId: currentStore,
          fromAccountId,
          toAccountId,
          amount,
          date: new Date().toISOString(),
          note,
        };
        
        set((state) => {
          const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === fromAccountId) {
              return { ...acc, currentBalance: acc.currentBalance - amount };
            }
            if (acc.id === toAccountId) {
              return { ...acc, currentBalance: acc.currentBalance + amount };
            }
            return acc;
          });
          
          return {
            transfers: [...state.transfers, newTransfer],
            accounts: updatedAccounts,
          };
        });
        
        return { success: true };
      },
      
      products: [],
      getStoreProducts: () => {
        const { products, currentStore } = get();
        if (!currentStore) return [];
        return products.filter(p => p.storeId === currentStore);
      },
      addProduct: (productData) => {
        const { currentStore } = get();
        if (!currentStore) return;
        
        const newProduct: Product = {
          ...productData,
          id: nanoid(),
          storeId: currentStore,
        };
        
        set((state) => ({ products: [...state.products, newProduct] }));
      },
      updateProduct: (id, productData) => {
        set((state) => ({
          products: state.products.map(p => 
            p.id === id ? { ...p, ...productData } : p
          ),
        }));
      },
      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter(p => p.id !== id),
        }));
      },
      
      openings: [],
      getStoreOpenings: () => {
        const { openings, currentStore } = get();
        if (!currentStore) return [];
        return openings.filter(o => o.storeId === currentStore).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },
      addOpening: (cajaMayor, cajaMenor) => {
         const { currentStore } = get();
         if (!currentStore) return;
         
         const openingTime = new Date().toISOString();
         const newOpening: OpeningRecord = {
           id: nanoid(),
           storeId: currentStore,
           date: openingTime,
           cajaMayor,
           cajaMenor
         };
         
         set(state => {
           const updatedAccounts = state.accounts.map(acc => {
             if (acc.storeId === currentStore) {
               if (acc.name === "Caja Mayor") {
                 return {
                   ...acc,
                   initialBalance: cajaMayor,
                   currentBalance: cajaMayor
                 };
               }
               if (acc.name === "Caja Menor") {
                 return {
                   ...acc,
                   initialBalance: cajaMenor,
                   currentBalance: cajaMenor
                 };
               }
             }
             return acc;
           });
           
           return {
             accounts: updatedAccounts,
             openings: [newOpening, ...state.openings],
             lastOpeningDate: openingTime
           };
         });
      },

      reset: () => set({ 
        accounts: [], 
        transactions: [], 
        transfers: [],
        products: [],
        openings: [], 
        isAuthenticated: false, 
        currentStore: null, 
        lastOpeningDate: null 
      })
    }),
    {
      name: 'finanzas-pro-storage-v5',
    }
  )
);
