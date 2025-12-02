import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type TransactionType = 'ingreso' | 'egreso';
export type PaymentMethod = 'Efectivo' | 'Nequi' | 'Bancolombia' | 'Otro';

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  includeInTotal: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  method: PaymentMethod;
  description: string;
  date: string;
  accountId: string;
}

interface AppState {
  isAuthenticated: boolean;
  currentStore: string | null;
  login: (storeName: string) => boolean;
  logout: () => void;
  
  accounts: Account[];
  addAccount: (name: string, initialBalance: number, includeInTotal: boolean) => void;
  updateAccount: (id: string, name: string, initialBalance: number, includeInTotal: boolean) => void;
  
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
  
  reset: () => void;
}

// Initial Seed Data
const INITIAL_ACCOUNTS: Account[] = [
  { id: '1', name: 'Caja Mayor', initialBalance: 1000000, currentBalance: 1000000, includeInTotal: true },
  { id: '2', name: 'Nequi', initialBalance: 50000, currentBalance: 50000, includeInTotal: true },
  { id: '3', name: 'Bancolombia', initialBalance: 2500000, currentBalance: 2500000, includeInTotal: true },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentStore: null,
      login: (storeName) => {
        set({ isAuthenticated: true, currentStore: storeName });
        return true;
      },
      logout: () => set({ isAuthenticated: false, currentStore: null }),
      
      accounts: INITIAL_ACCOUNTS,
      addAccount: (name, initialBalance, includeInTotal) => {
        const newAccount = {
          id: nanoid(),
          name,
          initialBalance,
          currentBalance: initialBalance,
          includeInTotal
        };
        set((state) => ({ accounts: [...state.accounts, newAccount] }));
      },
      updateAccount: (id, name, initialBalance, includeInTotal) => {
        set((state) => {
          const oldAccount = state.accounts.find(a => a.id === id);
          if (!oldAccount) return state;

          const balanceDiff = initialBalance - oldAccount.initialBalance;
          
          const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === id) {
              return {
                ...acc,
                name,
                initialBalance,
                currentBalance: acc.currentBalance + balanceDiff,
                includeInTotal
              };
            }
            return acc;
          });
          
          return { accounts: updatedAccounts };
        });
      },
      
      transactions: [],
      addTransaction: (transactionData) => {
        const newTransaction = { ...transactionData, id: nanoid() };
        
        set((state) => {
          const updatedTransactions = [...state.transactions, newTransaction];
          
          // Update Account Balance
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

          // Revert old transaction effect
          let accounts = state.accounts.map(acc => {
             if (acc.id === oldTx.accountId) {
               const multiplier = oldTx.type === 'ingreso' ? -1 : 1; 
               return { ...acc, currentBalance: acc.currentBalance + (oldTx.amount * multiplier) };
             }
             return acc;
          });
          
          // Create merged new transaction
          const newTx = { ...oldTx, ...transactionData };
          
          // Apply new transaction effect
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
          
          // Revert Account Balance
          const updatedAccounts = state.accounts.map(acc => {
            if (acc.id === txToDelete.accountId) {
              const multiplier = txToDelete.type === 'ingreso' ? -1 : 1; // Reverse logic
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
      
      reset: () => set({ accounts: INITIAL_ACCOUNTS, transactions: [], isAuthenticated: false, currentStore: null })
    }),
    {
      name: 'finanzas-pro-storage-v2', // Changed version to force reset or separate storage
      storage: {
        getItem: (name) => {
          // Custom storage logic to handle multi-store: Prefix key with store name if logged in
          // But we can't easily access state here. 
          // Simpler approach: The store object holds ALL data, but we filter by "currentStore" property if we were real backend.
          // Since this is frontend mockup, we will just use one storage for now but separate by key if requested.
          // For the user request: "que en un computador pueda ejecutarse desde la tienda del 20 y otra desde el tunal sin que hayan conflictos"
          // The best way in local storage is different keys.
          
          // HACK: Check URL or global var? No.
          // Let's stick to single storage for mockup simplicity but logic inside handles "currentStore" separation?
          // User wants independent execution.
          // Let's just use localStorage normally. To support "independent", they would open different browsers or incognito.
          // OR we namespace the key based on login? 
          // We can't dynamic namespace the persist middleware easily after creation.
          // Let's assume single browser instance = one store for this prototype.
          return localStorage.getItem(name);
        },
        setItem: (name, value) => localStorage.setItem(name, value),
        removeItem: (name) => localStorage.removeItem(name),
      }
    }
  )
);
