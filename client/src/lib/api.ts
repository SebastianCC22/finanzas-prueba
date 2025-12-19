const API_BASE = '/api';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(error.detail || 'Error en la solicitud');
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async login(username: string, password: string) {
    const data = await this.request<{ access_token: string; token_type: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(userData: UserCreate) {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: userData,
    });
  }

  async getCurrentUser() {
    return this.request<User>('/auth/me');
  }

  async getStores() {
    return this.request<Store[]>('/stores');
  }

  async createStore(storeData: StoreCreate) {
    return this.request<Store>('/stores', {
      method: 'POST',
      body: storeData,
    });
  }

  async getCashRegisters(storeId?: number, includeGlobal: boolean = true) {
    const params = new URLSearchParams();
    if (storeId) params.append('store_id', storeId.toString());
    params.append('include_global', includeGlobal.toString());
    return this.request<CashRegister[]>(`/cash-registers?${params}`);
  }

  async getProducts(filters: ProductFilters = {}) {
    const params = new URLSearchParams();
    if (filters.storeId) params.append('store_id', filters.storeId.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.presentation) params.append('presentation', filters.presentation);
    if (filters.supplier) params.append('supplier', filters.supplier);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.lowStock) params.append('low_stock', 'true');
    if (filters.outOfStock) params.append('out_of_stock', 'true');
    return this.request<Product[]>(`/products?${params}`);
  }

  async getProduct(productId: number) {
    return this.request<Product>(`/products/${productId}`);
  }

  async createProduct(productData: ProductCreate) {
    return this.request<Product>('/products', {
      method: 'POST',
      body: productData,
    });
  }

  async updateProduct(productId: number, productData: ProductUpdate) {
    return this.request<Product>(`/products/${productId}`, {
      method: 'PUT',
      body: productData,
    });
  }

  async deleteProduct(productId: number) {
    return this.request<void>(`/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async getProductMovements(productId: number) {
    return this.request<StockMovement[]>(`/products/${productId}/movements`);
  }

  async createSale(saleData: SaleCreate) {
    return this.request<Sale>('/sales', {
      method: 'POST',
      body: saleData,
    });
  }

  async getSales(filters: SaleFilters = {}) {
    const params = new URLSearchParams();
    if (filters.storeId) params.append('store_id', filters.storeId.toString());
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    if (filters.userId) params.append('user_id', filters.userId.toString());
    if (filters.search) params.append('search', filters.search);
    return this.request<Sale[]>(`/sales?${params}`);
  }

  async getSale(saleId: number) {
    return this.request<Sale>(`/sales/${saleId}`);
  }

  async createReturn(returnData: ReturnCreate) {
    return this.request<Return>('/returns', {
      method: 'POST',
      body: returnData,
    });
  }

  async getReturns(filters: ReturnFilters = {}) {
    const params = new URLSearchParams();
    if (filters.storeId) params.append('store_id', filters.storeId.toString());
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    return this.request<Return[]>(`/returns?${params}`);
  }

  async createProductTransfer(transferData: ProductTransferCreate) {
    return this.request<ProductTransfer>('/product-transfers', {
      method: 'POST',
      body: transferData,
    });
  }

  async getProductTransfers(filters: TransferFilters = {}) {
    const params = new URLSearchParams();
    if (filters.fromStoreId) params.append('from_store_id', filters.fromStoreId.toString());
    if (filters.toStoreId) params.append('to_store_id', filters.toStoreId.toString());
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    return this.request<ProductTransfer[]>(`/product-transfers?${params}`);
  }

  async createExpense(expenseData: ExpenseCreate) {
    return this.request<Expense>('/expenses', {
      method: 'POST',
      body: expenseData,
    });
  }

  async getExpenses(filters: ExpenseFilters = {}) {
    const params = new URLSearchParams();
    if (filters.storeId) params.append('store_id', filters.storeId.toString());
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    return this.request<Expense[]>(`/expenses?${params}`);
  }

  async createCashTransfer(transferData: CashTransferCreate) {
    return this.request<CashTransfer>('/cash-transfers', {
      method: 'POST',
      body: transferData,
    });
  }

  async getCashTransfers(filters: CashTransferFilters = {}) {
    const params = new URLSearchParams();
    if (filters.storeId) params.append('store_id', filters.storeId.toString());
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    return this.request<CashTransfer[]>(`/cash-transfers?${params}`);
  }

  async createCashOpening(openingData: CashOpeningCreate) {
    return this.request<CashOpening>('/cash-openings', {
      method: 'POST',
      body: openingData,
    });
  }

  async getCashOpenings(filters: OpeningFilters = {}) {
    const params = new URLSearchParams();
    if (filters.storeId) params.append('store_id', filters.storeId.toString());
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    return this.request<CashOpening[]>(`/cash-openings?${params}`);
  }

  async getTodayOpening(storeId: number) {
    return this.request<CashOpening | null>(`/cash-openings/today/${storeId}`);
  }

  async updateCashOpening(openingId: number, data: { initial_balance?: number; notes?: string }) {
    return this.request<CashOpening>(`/cash-openings/${openingId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async createCashClosing(closingData: CashClosingCreate) {
    return this.request<CashClosing>('/cash-closings', {
      method: 'POST',
      body: closingData,
    });
  }

  async getCashClosings(filters: ClosingFilters = {}) {
    const params = new URLSearchParams();
    if (filters.storeId) params.append('store_id', filters.storeId.toString());
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    return this.request<CashClosing[]>(`/cash-closings?${params}`);
  }

  async updateCashClosing(closingId: number, data: { actual_balance?: number; notes?: string }) {
    return this.request<CashClosing>(`/cash-closings/${closingId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async getAlerts(storeId?: number, unreadOnly: boolean = false) {
    const params = new URLSearchParams();
    if (storeId) params.append('store_id', storeId.toString());
    if (unreadOnly) params.append('unread_only', 'true');
    return this.request<Alert[]>(`/alerts?${params}`);
  }

  async markAlertRead(alertId: number) {
    return this.request<void>(`/alerts/${alertId}/read`, {
      method: 'PUT',
    });
  }

  async resolveAlert(alertId: number) {
    return this.request<void>(`/alerts/${alertId}/resolve`, {
      method: 'PUT',
    });
  }

  async getDashboardStats(storeId?: number) {
    const params = new URLSearchParams();
    if (storeId) params.append('store_id', storeId.toString());
    return this.request<DashboardStats>(`/dashboard/stats?${params}`);
  }

  getExportUrl(type: 'sales' | 'inventory' | 'expenses', format: 'excel' | 'pdf', filters: Record<string, string> = {}) {
    const params = new URLSearchParams({ format, ...filters });
    return `${API_BASE}/reports/${type}/export?${params}`;
  }

  getClosingReportUrl(closingId: number) {
    return `${API_BASE}/reports/closing/${closingId}/export`;
  }
}

export const api = new ApiClient();

export interface User {
  id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  role: 'admin' | 'seller' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export interface UserCreate {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
  role?: 'admin' | 'seller' | 'viewer';
}

export interface Store {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StoreCreate {
  name: string;
  address?: string;
  phone?: string;
}

export interface CashRegister {
  id: number;
  store_id: number | null;
  name: string;
  payment_method: string;
  register_type: string;
  is_global: boolean;
  current_balance: number;
  created_at: string;
}

export interface Product {
  id: number;
  store_id: number;
  name: string;
  brand: string | null;
  supplier: string | null;
  sale_price: number;
  cost: number;
  has_iva: boolean;
  quantity: number;
  presentation: string;
  weight_volume: string | null;
  expiration_date: string | null;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCreate {
  store_id: number;
  name: string;
  brand?: string;
  supplier?: string;
  sale_price: number;
  cost?: number;
  has_iva?: boolean;
  quantity?: number;
  presentation?: string;
  weight_volume?: string;
  expiration_date?: string;
  min_stock?: number;
}

export interface ProductUpdate {
  name?: string;
  brand?: string;
  supplier?: string;
  sale_price?: number;
  cost?: number;
  has_iva?: boolean;
  quantity?: number;
  presentation?: string;
  weight_volume?: string;
  expiration_date?: string;
  min_stock?: number;
}

export interface ProductFilters {
  storeId?: number;
  search?: string;
  presentation?: string;
  supplier?: string;
  brand?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
}

export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: string;
  quantity: number;
  previous_quantity: number | null;
  new_quantity: number | null;
  reason: string | null;
  created_at: string;
}

export interface SaleItem {
  id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  original_price: number;
  final_price: number;
  discount_amount: number;
  discount_percent: number;
  discount_reason: string | null;
  has_iva: boolean;
  iva_amount: number;
  subtotal: number;
}

export interface Payment {
  id: number;
  cash_register_id: number;
  payment_method: string;
  amount: number;
  is_refund: boolean;
  created_at: string;
}

export interface Sale {
  id: number;
  store_id: number;
  user_id: number;
  sale_number: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  global_discount: number;
  global_discount_reason: string | null;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  items: SaleItem[];
  payments: Payment[];
}

export interface SaleItemCreate {
  product_id?: number;
  product_name: string;
  quantity: number;
  original_price: number;
  final_price: number;
  discount_amount?: number;
  discount_percent?: number;
  discount_reason?: string;
  has_iva?: boolean;
}

export interface PaymentCreate {
  cash_register_id: number;
  payment_method: string;
  amount: number;
}

export interface SaleCreate {
  store_id: number;
  items: SaleItemCreate[];
  payments: PaymentCreate[];
  global_discount?: number;
  global_discount_reason?: string;
  notes?: string;
}

export interface SaleFilters {
  storeId?: number;
  startDate?: string;
  endDate?: string;
  userId?: number;
  search?: string;
}

export interface Return {
  id: number;
  sale_id: number;
  user_id: number;
  return_type: string;
  total_refund: number;
  reason: string;
  created_at: string;
}

export interface ReturnItemCreate {
  sale_item_id: number;
  quantity: number;
  restock?: boolean;
}

export interface ReturnCreate {
  sale_id: number;
  return_type: string;
  reason: string;
  items: ReturnItemCreate[];
}

export interface ReturnFilters {
  storeId?: number;
  startDate?: string;
  endDate?: string;
}

export interface ProductTransfer {
  id: number;
  product_id: number;
  product_name: string | null;
  from_store_id: number;
  to_store_id: number;
  user_id: number;
  quantity: number;
  reason: string | null;
  created_at: string;
}

export interface ProductTransferCreate {
  product_id: number;
  from_store_id: number;
  to_store_id: number;
  quantity: number;
  reason?: string;
}

export interface TransferFilters {
  fromStoreId?: number;
  toStoreId?: number;
  startDate?: string;
  endDate?: string;
}

export interface Expense {
  id: number;
  store_id: number;
  user_id: number;
  cash_register_id: number;
  payment_method: string;
  amount: number;
  description: string;
  created_at: string;
}

export interface ExpenseCreate {
  store_id: number;
  cash_register_id: number;
  payment_method: string;
  amount: number;
  description: string;
}

export interface ExpenseFilters {
  storeId?: number;
  startDate?: string;
  endDate?: string;
}

export interface CashTransfer {
  id: number;
  from_register_id: number;
  to_register_id: number;
  user_id: number;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface CashTransferCreate {
  from_register_id: number;
  to_register_id: number;
  amount: number;
  note?: string;
}

export interface CashTransferFilters {
  storeId?: number;
  startDate?: string;
  endDate?: string;
}

export interface CashOpening {
  id: number;
  store_id: number;
  user_id: number;
  opening_date: string;
  initial_balance: number;
  notes: string | null;
  created_at: string;
}

export interface CashOpeningCreate {
  store_id: number;
  initial_balance?: number;
  notes?: string;
}

export interface OpeningFilters {
  storeId?: number;
  startDate?: string;
  endDate?: string;
}

export interface CashClosing {
  id: number;
  opening_id: number;
  store_id: number;
  user_id: number;
  closing_date: string;
  expected_balance: number;
  actual_balance: number;
  difference: number;
  total_sales: number;
  total_expenses: number;
  total_transfers_in: number;
  total_transfers_out: number;
  notes: string | null;
  created_at: string;
}

export interface CashClosingCreate {
  opening_id: number;
  store_id: number;
  actual_balance: number;
  notes?: string;
}

export interface ClosingFilters {
  storeId?: number;
  startDate?: string;
  endDate?: string;
}

export interface Alert {
  id: number;
  store_id: number | null;
  alert_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  is_resolved: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_sales_today: number;
  total_sales_week: number;
  total_sales_month: number;
  total_expenses_today: number;
  products_low_stock: number;
  products_out_of_stock: number;
  products_expiring_soon: number;
  unread_alerts: number;
}
