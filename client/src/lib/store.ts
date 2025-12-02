import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type TransactionType = 'ingreso' | 'egreso';
export type PaymentMethod = 'Efectivo' | 'Nequi' | 'Bancolombia' | 'Otro';

export interface Account {
  id: string;
  storeId: string;
  name: string;
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
}

export interface OpeningRecord {
  id: string;
  storeId: string;
  date: string;
  cajaMayor: number;
  cajaMenor: number;
}

interface AppState {
  isAuthenticated: boolean;
  currentStore: string | null;
  login: (storeName: string) => boolean;
  logout: () => void;
  
  accounts: Account[];
  getStoreAccounts: () => Account[];
  addAccount: (name: string, initialBalance: number, includeInTotal: boolean) => void;
  updateAccount: (id: string, name: string, initialBalance: number, includeInTotal: boolean) => void;
  
  transactions: Transaction[];
  getStoreTransactions: () => Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'storeId'>) => void;
  updateTransaction: (id: string, transaction: Partial<Omit<Transaction, 'id' | 'storeId'>>) => void;
  deleteTransaction: (id: string) => void;
  
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
      login: (storeName) => {
        set({ isAuthenticated: true, currentStore: storeName });
        return true;
      },
      logout: () => set({ isAuthenticated: false, currentStore: null }),
      
      accounts: [],
      getStoreAccounts: () => {
        const { accounts, currentStore } = get();
        if (!currentStore) return [];
        return accounts.filter(a => a.storeId === currentStore);
      },
      addAccount: (name, initialBalance, includeInTotal) => {
        const { currentStore } = get();
        if (!currentStore) return;
        
        const newAccount: Account = {
          id: nanoid(),
          storeId: currentStore,
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
      getStoreTransactions: () => {
        const { transactions, currentStore } = get();
        if (!currentStore) return [];
        return transactions.filter(t => t.storeId === currentStore);
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
      
      openings: [],
      getStoreOpenings: () => {
        const { openings, currentStore } = get();
        if (!currentStore) return [];
        return openings.filter(o => o.storeId === currentStore).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },
      addOpening: (cajaMayor, cajaMenor) => {
         const { currentStore } = get();
         if (!currentStore) return;
         
         const newOpening: OpeningRecord = {
           id: nanoid(),
           storeId: currentStore,
           date: new Date().toISOString(),
           cajaMayor,
           cajaMenor
         };
         set(state => ({ openings: [newOpening, ...state.openings] }));
      },

      reset: () => set({ accounts: [], transactions: [], openings: [], isAuthenticated: false, currentStore: null })
    }),
    {
      name: 'finanzas-pro-storage-v3', // Version bump for new schema
    }
  )
);
