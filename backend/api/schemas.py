from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    SELLER = "seller"
    VIEWER = "viewer"

class PaymentMethod(str, Enum):
    EFECTIVO = "efectivo"
    NEQUI = "nequi"
    BOLD = "bold"
    DAVIPLATA = "daviplata"

class ProductPresentation(str, Enum):
    JARABE = "jarabe"
    LIQUIDO = "liquido"
    POLVO = "polvo"
    TABLETAS = "tabletas"
    CAPSULAS = "capsulas"
    CREMA = "crema"
    GEL = "gel"
    POMADA = "pomada"
    OTROS = "otros"

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: UserRole = UserRole.SELLER

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    store_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class StoreBase(BaseModel):
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None

class StoreCreate(StoreBase):
    pass

class StoreResponse(StoreBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CashRegisterBase(BaseModel):
    name: str
    payment_method: PaymentMethod
    register_type: str
    is_global: bool = False

class CashRegisterCreate(CashRegisterBase):
    store_id: Optional[int] = None

class CashRegisterResponse(CashRegisterBase):
    id: int
    store_id: Optional[int]
    current_balance: float
    created_at: datetime

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    brand: Optional[str] = None
    supplier: Optional[str] = None
    sale_price: float
    cost: float = 0
    has_iva: bool = False
    quantity: int = 0
    presentation: ProductPresentation = ProductPresentation.OTROS
    weight_volume: Optional[str] = None
    expiration_date: Optional[datetime] = None
    min_stock: int = 5

class ProductCreate(ProductBase):
    store_id: int

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    supplier: Optional[str] = None
    sale_price: Optional[float] = None
    cost: Optional[float] = None
    has_iva: Optional[bool] = None
    quantity: Optional[int] = None
    presentation: Optional[ProductPresentation] = None
    weight_volume: Optional[str] = None
    expiration_date: Optional[datetime] = None
    min_stock: Optional[int] = None

class ProductResponse(ProductBase):
    id: int
    store_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SaleItemCreate(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    quantity: int
    original_price: float
    final_price: float
    discount_amount: float = 0
    discount_percent: float = 0
    discount_reason: Optional[str] = None
    has_iva: bool = False

class PaymentCreate(BaseModel):
    cash_register_id: int
    payment_method: PaymentMethod
    amount: float

class SaleCreate(BaseModel):
    store_id: int
    items: List[SaleItemCreate]
    payments: List[PaymentCreate]
    global_discount: float = 0
    global_discount_reason: Optional[str] = None
    notes: Optional[str] = None

class SaleItemResponse(BaseModel):
    id: int
    product_id: Optional[int]
    product_name: str
    quantity: int
    original_price: float
    final_price: float
    discount_amount: float
    discount_percent: float
    discount_reason: Optional[str]
    has_iva: bool
    iva_amount: float
    subtotal: float

    class Config:
        from_attributes = True

class PaymentResponse(BaseModel):
    id: int
    cash_register_id: int
    payment_method: str
    amount: float
    is_refund: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SaleResponse(BaseModel):
    id: int
    store_id: int
    user_id: int
    sale_number: str
    subtotal: float
    tax_total: float
    discount_total: float
    global_discount: float
    global_discount_reason: Optional[str]
    total: float
    status: str
    notes: Optional[str]
    created_at: datetime
    items: List[SaleItemResponse] = []
    payments: List[PaymentResponse] = []

    class Config:
        from_attributes = True

class ReturnItemCreate(BaseModel):
    sale_item_id: int
    quantity: int
    restock: bool = True

class ReturnCreate(BaseModel):
    sale_id: int
    return_type: str
    reason: str
    items: List[ReturnItemCreate]

class ReturnResponse(BaseModel):
    id: int
    sale_id: int
    user_id: int
    return_type: str
    total_refund: float
    reason: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProductTransferCreate(BaseModel):
    product_id: int
    from_store_id: int
    to_store_id: int
    quantity: int
    reason: Optional[str] = None

class ProductTransferResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    from_store_id: int
    to_store_id: int
    user_id: int
    quantity: int
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class CashOpeningUpdate(BaseModel):
    initial_balance: Optional[float] = None
    notes: Optional[str] = None

class ExpenseCreate(BaseModel):
    store_id: int
    cash_register_id: int
    payment_method: PaymentMethod
    amount: float
    description: str

class ExpenseResponse(BaseModel):
    id: int
    store_id: int
    user_id: int
    cash_register_id: int
    payment_method: str
    amount: float
    description: str
    created_at: datetime

    class Config:
        from_attributes = True

class CashTransferCreate(BaseModel):
    from_register_id: int
    to_register_id: int
    amount: float
    note: Optional[str] = None

class CashTransferResponse(BaseModel):
    id: int
    from_register_id: int
    to_register_id: int
    user_id: int
    amount: float
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class CashOpeningCreate(BaseModel):
    store_id: int
    initial_balance: float = 0
    notes: Optional[str] = None

class CashOpeningResponse(BaseModel):
    id: int
    store_id: int
    user_id: int
    opening_date: datetime
    initial_balance: float
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class CashClosingCreate(BaseModel):
    opening_id: int
    store_id: int
    actual_balance: float
    notes: Optional[str] = None

class CashClosingUpdate(BaseModel):
    actual_balance: Optional[float] = None
    notes: Optional[str] = None

class CashClosingResponse(BaseModel):
    id: int
    opening_id: int
    store_id: int
    user_id: int
    closing_date: datetime
    expected_balance: float
    actual_balance: float
    difference: float
    total_sales: float
    total_expenses: float
    total_transfers_in: float
    total_transfers_out: float
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class AlertResponse(BaseModel):
    id: int
    store_id: Optional[int]
    alert_type: str
    title: str
    message: Optional[str]
    is_read: bool
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    movement_type: str
    quantity: int
    previous_quantity: Optional[int]
    new_quantity: Optional[int]
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentMethodStats(BaseModel):
    payment_method: str
    total_amount: float
    transaction_count: int
    percentage: float

class StoreStats(BaseModel):
    store_id: int
    store_name: str
    total_sales: float
    total_expenses: float
    profit: float
    sales_count: int

class TopProduct(BaseModel):
    product_id: int
    product_name: str
    quantity_sold: int
    total_revenue: float

class AdvancedStats(BaseModel):
    payment_methods: List[PaymentMethodStats]
    stores: List[StoreStats]
    top_products: List[TopProduct]
    least_sold_products: List[TopProduct]

class DashboardStats(BaseModel):
    total_sales_today: float
    total_sales_week: float
    total_sales_month: float
    total_expenses_today: float
    total_expenses_week: float = 0
    total_expenses_month: float = 0
    products_low_stock: int
    products_out_of_stock: int
    products_expiring_soon: int
    unread_alerts: int
    profit_today: float = 0
    profit_week: float = 0
    profit_month: float = 0
    cost_today: float = 0
    cost_week: float = 0
    cost_month: float = 0
    sales_count_today: int = 0
    sales_count_week: int = 0
    sales_count_month: int = 0
    average_ticket: float = 0
    inventory_value: float = 0
    pending_invoices: int = 0
    pending_invoices_amount: float = 0
    overdue_invoices: int = 0

class InvoiceStatus(str, Enum):
    PENDING = "pendiente"
    PARTIAL = "parcial"
    PAID = "pagada"
    OVERDUE = "vencida"
    CANCELLED = "cancelada"

class InvoicePaymentType(str, Enum):
    EFECTIVO = "efectivo"
    TRANSFERENCIA = "transferencia"
    CREDITO = "credito"
    CHEQUE = "cheque"
    OTRO = "otro"

class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierResponse(SupplierBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    invoices_count: int = 0
    pending_amount: float = 0

    class Config:
        from_attributes = True

class SupplierInvoiceBase(BaseModel):
    supplier_id: int
    invoice_number: str
    issue_date: datetime
    due_date: datetime
    total_amount: float
    payment_type: str = "efectivo"
    notes: Optional[str] = None

class SupplierInvoiceCreate(SupplierInvoiceBase):
    pass

class SupplierInvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    total_amount: Optional[float] = None
    payment_type: Optional[str] = None
    status: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None

class InvoicePaymentCreate(BaseModel):
    amount: float
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None

class InvoicePaymentResponse(BaseModel):
    id: int
    invoice_id: int
    amount: float
    payment_date: datetime
    payment_method: Optional[str]
    reference: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class SupplierInvoiceResponse(SupplierInvoiceBase):
    id: int
    paid_amount: float
    status: str
    image_url: Optional[str]
    invoice_file_url: Optional[str] = None
    invoice_file_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    supplier_name: str = ""
    remaining_amount: float = 0
    has_file: bool = False
    payments: List[InvoicePaymentResponse] = []

    class Config:
        from_attributes = True

class SupplierInvoiceSummary(BaseModel):
    total_pending: float
    total_overdue: float
    total_paid_this_month: float
    invoices_pending_count: int
    invoices_overdue_count: int
    invoices_due_soon_count: int

class BackupType(str, Enum):
    MANUAL = "manual"
    AUTOMATIC = "automatic"

class BackupStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    IN_PROGRESS = "in_progress"

class BackupCreate(BaseModel):
    backup_type: BackupType = BackupType.MANUAL

class BackupResponse(BaseModel):
    id: int
    filename: str
    filepath: str
    backup_type: str
    status: str
    file_size: Optional[int]
    user_id: Optional[int]
    error_message: Optional[str]
    created_at: datetime
    username: Optional[str] = None

    class Config:
        from_attributes = True

class BackupListResponse(BaseModel):
    backups: List[BackupResponse]
    total: int

class PaymentScheduleStatus(str, Enum):
    PAGADA = "pagada"
    PARCIAL = "parcial"
    PENDIENTE = "pendiente"

class PaymentScheduleType(str, Enum):
    TOTAL = "total"
    ABONO = "abono"

class PaymentScheduleCreate(BaseModel):
    supplier_invoice_id: int
    payment_type: str = "total"
    week_start: datetime
    week_end: datetime

class PaymentScheduleUpdate(BaseModel):
    payment_type: Optional[str] = None
    week_start: Optional[datetime] = None
    week_end: Optional[datetime] = None

class PaymentSchedulePayment(BaseModel):
    amount: float
    payment_method: str = "efectivo"
    notes: Optional[str] = None

class PaymentScheduleResponse(BaseModel):
    id: int
    supplier_id: int
    supplier_invoice_id: int
    invoice_due_date: datetime
    invoice_number: str
    invoice_amount: float
    payment_type: str
    paid_amount: float
    pending_amount: float
    status: str
    week_start: datetime
    week_end: datetime
    created_at: datetime
    updated_at: datetime
    supplier_name: str = ""

    class Config:
        from_attributes = True

class SupplierPaymentSummary(BaseModel):
    proveedor: str
    pagado: float
    pendiente: float

class PaymentScheduleSummary(BaseModel):
    total_programado: float
    total_pagado: float
    total_pendiente: float
    por_proveedor: List[SupplierPaymentSummary]
