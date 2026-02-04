import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, User, Store } from './api';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  currentStore: Store | null;
  stores: Store[];
  token: string | null;
  
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setCurrentStore: (store: Store) => void;
  loadStores: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      currentStore: null,
      stores: [],
      token: null,

      login: async (username: string, password: string) => {
        const response = await api.login(username, password);
        set({
          isAuthenticated: true,
          user: response.user,
          token: response.access_token,
        });
        
        const stores = await api.getStores();
        set({ stores });
        
        if (response.user.store_id) {
          const userStore = stores.find(s => s.id === response.user.store_id);
          if (userStore) {
            set({ currentStore: userStore });
          }
        }
      },

      logout: () => {
        api.setToken(null);
        set({
          isAuthenticated: false,
          user: null,
          currentStore: null,
          stores: [],
          token: null,
        });
      },

      setCurrentStore: (store: Store) => {
        const { user } = get();
        if (user?.role === 'seller' && user?.store_id) {
          return;
        }
        set({ currentStore: store });
      },

      loadStores: async () => {
        try {
          const stores = await api.getStores();
          set({ stores });
        } catch (error) {
          console.error('Error loading stores:', error);
        }
      },

      checkAuth: async () => {
        const token = api.getToken();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return false;
        }

        try {
          const user = await api.getCurrentUser();
          set({ isAuthenticated: true, user });
          
          const stores = await api.getStores();
          set({ stores });
          
          const { currentStore } = get();
          
          if (user.store_id) {
            const userStore = stores.find(s => s.id === user.store_id);
            if (userStore) {
              set({ currentStore: userStore });
            }
          } else if (user.role === 'admin') {
            if (currentStore) {
              const validStore = stores.find(s => s.id === currentStore.id);
              if (!validStore) {
                set({ currentStore: null });
              }
            }
          }
          
          return true;
        } catch (error) {
          set({ isAuthenticated: false, user: null, token: null });
          api.setToken(null);
          return false;
        }
      },
    }),
    {
      name: 'finanzas-auth-v1',
      partialize: (state) => ({
        token: state.token,
        currentStore: state.currentStore,
      }),
    }
  )
);
