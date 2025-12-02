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
  login: (password: string) => boolean;
  logout: () => void;
  
  accounts: Account[];
  addAccount: (name: string, initialBalance: number) => void;
  
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  
  reset: () => void;
}

// Initial Seed Data
const INITIAL_ACCOUNTS: Account[] = [
  { id: '1', name: 'Caja Mayor', initialBalance: 1000000, currentBalance: 1000000 },
  { id: '2', name: 'Nequi', initialBalance: 50000, currentBalance: 50000 },
  { id: '3', name: 'Bancolombia', initialBalance: 2500000, currentBalance: 2500000 },
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      login: (password) => {
        if (password === '1234') {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },
      logout: () => set({ isAuthenticated: false }),
      
      accounts: INITIAL_ACCOUNTS,
      addAccount: (name, initialBalance) => {
        const newAccount = {
          id: nanoid(),
          name,
          initialBalance,
          currentBalance: initialBalance
        };
        set((state) => ({ accounts: [...state.accounts, newAccount] }));
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
      
      reset: () => set({ accounts: INITIAL_ACCOUNTS, transactions: [], isAuthenticated: false })
    }),
    {
      name: 'finanzas-pro-storage',
    }
  )
);
