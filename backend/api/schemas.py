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

class DashboardStats(BaseModel):
    total_sales_today: float
    total_sales_week: float
    total_sales_month: float
    total_expenses_today: float
    products_low_stock: int
    products_out_of_stock: int
    products_expiring_soon: int
    unread_alerts: int
