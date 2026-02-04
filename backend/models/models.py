from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from .database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SELLER = "seller"
    VIEWER = "viewer"

class PaymentMethod(str, enum.Enum):
    EFECTIVO = "efectivo"
    NEQUI = "nequi"
    BOLD = "bold"
    DAVIPLATA = "daviplata"

class ProductPresentation(str, enum.Enum):
    JARABE = "jarabe"
    LIQUIDO = "liquido"
    POLVO = "polvo"
    TABLETAS = "tabletas"
    CAPSULAS = "capsulas"
    CREMA = "crema"
    GEL = "gel"
    POMADA = "pomada"
    OTROS = "otros"

class CashRegisterType(str, enum.Enum):
    MAYOR = "mayor"
    MENOR = "menor"

class AlertType(str, enum.Enum):
    OUT_OF_STOCK = "out_of_stock"
    LOW_STOCK = "low_stock"
    EXPIRING_SOON = "expiring_soon"
    NEGATIVE_BALANCE = "negative_balance"
    OPENING_PENDING = "opening_pending"
    CLOSING_PENDING = "closing_pending"
    INVOICE_DUE_SOON = "invoice_due_soon"
    INVOICE_OVERDUE = "invoice_overdue"

class InvoiceStatus(str, enum.Enum):
    PENDING = "pendiente"
    PARTIAL = "parcial"
    PAID = "pagada"
    OVERDUE = "vencida"
    CANCELLED = "cancelada"

class InvoicePaymentType(str, enum.Enum):
    EFECTIVO = "efectivo"
    TRANSFERENCIA = "transferencia"
    CREDITO = "credito"
    CHEQUE = "cheque"
    OTRO = "otro"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(20), default=UserRole.SELLER.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    sales = relationship("Sale", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class Store(Base):
    __tablename__ = "stores"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    address = Column(String(255))
    phone = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    cash_registers = relationship("CashRegister", back_populates="store")
    products = relationship("Product", back_populates="store")
    sales = relationship("Sale", back_populates="store")
    openings = relationship("CashOpening", back_populates="store")
    closings = relationship("CashClosing", back_populates="store")

class CashRegister(Base):
    __tablename__ = "cash_registers"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    name = Column(String(100), nullable=False)
    payment_method = Column(String(20), nullable=False)
    register_type = Column(String(10), nullable=False)
    is_global = Column(Boolean, default=False)
    current_balance = Column(Numeric(15, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    store = relationship("Store", back_populates="cash_registers")
    payments = relationship("Payment", back_populates="cash_register")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    name = Column(String(255), nullable=False)
    brand = Column(String(100))
    supplier = Column(String(100))
    sale_price = Column(Numeric(15, 2), nullable=False)
    cost = Column(Numeric(15, 2), default=0)
    has_iva = Column(Boolean, default=False)
    quantity = Column(Integer, default=0)
    presentation = Column(String(20), default=ProductPresentation.OTROS.value)
    weight_volume = Column(String(50))
    expiration_date = Column(DateTime)
    min_stock = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    store = relationship("Store", back_populates="products")
    stock_movements = relationship("StockMovement", back_populates="product")
    sale_items = relationship("SaleItem", back_populates="product")

class StockMovement(Base):
    __tablename__ = "stock_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    movement_type = Column(String(20), nullable=False)
    quantity = Column(Integer, nullable=False)
    previous_quantity = Column(Integer)
    new_quantity = Column(Integer)
    reason = Column(Text)
    reference_id = Column(Integer)
    reference_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="stock_movements")

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sale_number = Column(String(50), unique=True, nullable=False)
    subtotal = Column(Numeric(15, 2), default=0)
    tax_total = Column(Numeric(15, 2), default=0)
    discount_total = Column(Numeric(15, 2), default=0)
    global_discount = Column(Numeric(15, 2), default=0)
    global_discount_reason = Column(String(255))
    total = Column(Numeric(15, 2), default=0)
    status = Column(String(20), default="completed")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    store = relationship("Store", back_populates="sales")
    user = relationship("User", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="sale", cascade="all, delete-orphan")
    returns = relationship("Return", back_populates="sale")

class SaleItem(Base):
    __tablename__ = "sale_items"
    
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"))
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    original_price = Column(Numeric(15, 2), nullable=False)
    final_price = Column(Numeric(15, 2), nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0)
    discount_percent = Column(Numeric(5, 2), default=0)
    discount_reason = Column(String(255))
    has_iva = Column(Boolean, default=False)
    iva_amount = Column(Numeric(15, 2), default=0)
    subtotal = Column(Numeric(15, 2), nullable=False)
    
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"))
    return_id = Column(Integer, ForeignKey("returns.id"))
    cash_register_id = Column(Integer, ForeignKey("cash_registers.id"), nullable=False)
    payment_method = Column(String(20), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    is_refund = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sale = relationship("Sale", back_populates="payments")
    cash_register = relationship("CashRegister", back_populates="payments")

class Return(Base):
    __tablename__ = "returns"
    
    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    return_type = Column(String(20), nullable=False)
    total_refund = Column(Numeric(15, 2), default=0)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sale = relationship("Sale", back_populates="returns")
    items = relationship("ReturnItem", back_populates="return_record", cascade="all, delete-orphan")

class ReturnItem(Base):
    __tablename__ = "return_items"
    
    id = Column(Integer, primary_key=True, index=True)
    return_id = Column(Integer, ForeignKey("returns.id"), nullable=False)
    sale_item_id = Column(Integer, ForeignKey("sale_items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    refund_amount = Column(Numeric(15, 2), nullable=False)
    restock = Column(Boolean, default=True)
    
    return_record = relationship("Return", back_populates="items")

class ProductTransfer(Base):
    __tablename__ = "product_transfers"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    from_store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    to_store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cash_register_id = Column(Integer, ForeignKey("cash_registers.id"), nullable=False)
    payment_method = Column(String(20), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class CashTransfer(Base):
    __tablename__ = "cash_transfers"
    
    id = Column(Integer, primary_key=True, index=True)
    from_register_id = Column(Integer, ForeignKey("cash_registers.id"), nullable=False)
    to_register_id = Column(Integer, ForeignKey("cash_registers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class CashOpening(Base):
    __tablename__ = "cash_openings"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    opening_date = Column(DateTime, nullable=False)
    initial_balance = Column(Numeric(15, 2), default=0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    store = relationship("Store", back_populates="openings")
    closing = relationship("CashClosing", back_populates="opening", uselist=False)

class CashClosing(Base):
    __tablename__ = "cash_closings"
    
    id = Column(Integer, primary_key=True, index=True)
    opening_id = Column(Integer, ForeignKey("cash_openings.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    closing_date = Column(DateTime, nullable=False)
    expected_balance = Column(Numeric(15, 2), default=0)
    actual_balance = Column(Numeric(15, 2), default=0)
    difference = Column(Numeric(15, 2), default=0)
    total_sales = Column(Numeric(15, 2), default=0)
    total_expenses = Column(Numeric(15, 2), default=0)
    total_transfers_in = Column(Numeric(15, 2), default=0)
    total_transfers_out = Column(Numeric(15, 2), default=0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    store = relationship("Store", back_populates="closings")
    opening = relationship("CashOpening", back_populates="closing")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"))
    alert_type = Column(String(30), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text)
    reference_id = Column(Integer)
    reference_type = Column(String(50))
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(Integer)
    old_values = Column(Text)
    new_values = Column(Text)
    ip_address = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="audit_logs")

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    contact_name = Column(String(255))
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    invoices = relationship("SupplierInvoice", back_populates="supplier")

class SupplierInvoice(Base):
    __tablename__ = "supplier_invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    invoice_number = Column(String(100), nullable=False)
    issue_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)
    paid_amount = Column(Numeric(15, 2), default=0)
    payment_type = Column(String(20), default="efectivo")
    status = Column(String(20), default="pendiente")
    image_url = Column(String(500))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    supplier = relationship("Supplier", back_populates="invoices")
    payments = relationship("InvoicePayment", back_populates="invoice")

class InvoicePayment(Base):
    __tablename__ = "invoice_payments"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("supplier_invoices.id"), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow)
    payment_method = Column(String(50))
    reference = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    invoice = relationship("SupplierInvoice", back_populates="payments")

class Backup(Base):
    __tablename__ = "backups"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    backup_type = Column(String(20), default="manual")
    status = Column(String(20), default="in_progress")
    file_size = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
