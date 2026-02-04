from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import FileResponse
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from backend.models.database import get_db
from backend.models.models import (
    User, Store, CashRegister, Product, StockMovement,
    Sale, SaleItem, Payment, Return, ReturnItem,
    ProductTransfer, Expense, CashTransfer,
    CashOpening, CashClosing, Alert, AuditLog,
    Supplier, SupplierInvoice, InvoicePayment, Backup
)
from backend.api.schemas import (
    UserCreate, UserResponse, UserLogin, Token,
    StoreCreate, StoreResponse,
    CashRegisterCreate, CashRegisterResponse,
    ProductCreate, ProductUpdate, ProductResponse,
    SaleCreate, SaleResponse,
    ReturnCreate, ReturnResponse,
    ProductTransferCreate, ProductTransferResponse,
    ExpenseCreate, ExpenseResponse,
    CashTransferCreate, CashTransferResponse,
    CashOpeningCreate, CashOpeningResponse, CashOpeningUpdate,
    CashClosingCreate, CashClosingResponse, CashClosingUpdate,
    AlertResponse, StockMovementResponse, DashboardStats,
    PaymentMethodStats, StoreStats, TopProduct, AdvancedStats,
    SupplierCreate, SupplierUpdate, SupplierResponse,
    SupplierInvoiceCreate, SupplierInvoiceUpdate, SupplierInvoiceResponse,
    InvoicePaymentCreate, InvoicePaymentResponse, SupplierInvoiceSummary,
    BackupCreate, BackupResponse, BackupListResponse
)
from backend.services.backup_service import create_backup, get_latest_backup, get_all_backups
from backend.services.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_admin
)
from backend.services.export import (
    export_to_excel, export_to_pdf,
    generate_sales_report_data, generate_inventory_report_data,
    generate_expenses_report_data, generate_cash_closing_report
)
from backend.services.alerts import run_all_alerts

router = APIRouter()

@router.post("/auth/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=get_password_hash(user.password),
        full_name=user.full_name,
        role=user.role.value
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/auth/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User is inactive")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.get("/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(User).all()

@router.post("/stores", response_model=StoreResponse)
def create_store(store: StoreCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_store = Store(**store.model_dump())
    db.add(db_store)
    db.commit()
    db.refresh(db_store)
    
    payment_methods = ["efectivo", "nequi", "bold", "daviplata"]
    for method in payment_methods:
        menor = CashRegister(
            store_id=db_store.id,
            name=f"Caja Menor {method.capitalize()}",
            payment_method=method,
            register_type="menor",
            is_global=False
        )
        db.add(menor)
        
        if method == "efectivo":
            mayor = CashRegister(
                store_id=db_store.id,
                name=f"Caja Mayor Efectivo",
                payment_method=method,
                register_type="mayor",
                is_global=False
            )
            db.add(mayor)
    
    global_registers = db.query(CashRegister).filter(CashRegister.is_global == True).all()
    if not global_registers:
        for method in ["nequi", "bold", "daviplata"]:
            global_register = CashRegister(
                store_id=None,
                name=f"Caja Mayor {method.capitalize()} (Global)",
                payment_method=method,
                register_type="mayor",
                is_global=True
            )
            db.add(global_register)
    
    db.commit()
    return db_store

@router.get("/stores", response_model=List[StoreResponse])
def get_stores(db: Session = Depends(get_db)):
    return db.query(Store).filter(Store.is_active == True).all()

@router.get("/stores/{store_id}", response_model=StoreResponse)
def get_store(store_id: int, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return store

@router.get("/cash-registers", response_model=List[CashRegisterResponse])
def get_cash_registers(
    store_id: Optional[int] = None,
    include_global: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(CashRegister)
    if store_id:
        if include_global:
            query = query.filter(
                (CashRegister.store_id == store_id) | (CashRegister.is_global == True)
            )
        else:
            query = query.filter(CashRegister.store_id == store_id)
    return query.all()

@router.post("/products", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    movement = StockMovement(
        product_id=db_product.id,
        user_id=current_user.id,
        movement_type="initial",
        quantity=product.quantity,
        previous_quantity=0,
        new_quantity=product.quantity,
        reason="Registro inicial"
    )
    db.add(movement)
    db.commit()
    
    return db_product

@router.get("/products", response_model=List[ProductResponse])
def get_products(
    store_id: Optional[int] = None,
    search: Optional[str] = None,
    presentation: Optional[str] = None,
    supplier: Optional[str] = None,
    brand: Optional[str] = None,
    low_stock: bool = False,
    out_of_stock: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.is_active == True)
    
    if store_id:
        query = query.filter(Product.store_id == store_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_term)) |
            (Product.brand.ilike(search_term)) |
            (Product.supplier.ilike(search_term))
        )
    if presentation:
        query = query.filter(Product.presentation == presentation)
    if supplier:
        query = query.filter(Product.supplier.ilike(f"%{supplier}%"))
    if brand:
        query = query.filter(Product.brand.ilike(f"%{brand}%"))
    if low_stock:
        query = query.filter(Product.quantity <= Product.min_stock, Product.quantity > 0)
    if out_of_stock:
        query = query.filter(Product.quantity == 0)
    
    return query.order_by(Product.name).all()

@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.put("/products/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    old_quantity = product.quantity
    update_data = product_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(product, key, value)
    
    if 'quantity' in update_data and update_data['quantity'] != old_quantity:
        movement = StockMovement(
            product_id=product.id,
            user_id=current_user.id,
            movement_type="adjustment",
            quantity=update_data['quantity'] - old_quantity,
            previous_quantity=old_quantity,
            new_quantity=update_data['quantity'],
            reason="Ajuste manual de inventario"
        )
        db.add(movement)
    
    db.commit()
    db.refresh(product)
    return product

@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.is_active = False
    db.commit()
    return {"message": "Product deleted successfully"}

@router.get("/products/{product_id}/movements", response_model=List[StockMovementResponse])
def get_product_movements(product_id: int, db: Session = Depends(get_db)):
    movements = db.query(StockMovement).filter(
        StockMovement.product_id == product_id
    ).order_by(StockMovement.created_at.desc()).all()
    return movements

@router.post("/sales", response_model=SaleResponse)
def create_sale(sale_data: SaleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.now()
    opening = db.query(CashOpening).filter(
        CashOpening.store_id == sale_data.store_id,
        func.date(CashOpening.opening_date) == today.date()
    ).first()
    
    if not opening:
        raise HTTPException(status_code=400, detail="No hay apertura de caja para hoy. Debe realizar la apertura primero.")
    
    existing_closing = db.query(CashClosing).filter(
        CashClosing.opening_id == opening.id
    ).first()
    if existing_closing:
        raise HTTPException(status_code=400, detail="La caja ya fue cerrada hoy.")
    
    sale_count = db.query(Sale).filter(
        func.date(Sale.created_at) == today.date()
    ).count()
    sale_number = f"VTA-{today.strftime('%Y%m%d')}-{sale_count + 1:04d}"
    
    try:
        subtotal = Decimal('0')
        tax_total = Decimal('0')
        discount_total = Decimal('0')
        
        sale = Sale(
            store_id=sale_data.store_id,
            user_id=current_user.id,
            sale_number=sale_number,
            global_discount=Decimal(str(sale_data.global_discount)),
            global_discount_reason=sale_data.global_discount_reason,
            notes=sale_data.notes
        )
        db.add(sale)
        db.flush()
        
        for item_data in sale_data.items:
            item_subtotal = Decimal(str(item_data.final_price)) * item_data.quantity
            iva_amount = Decimal('0')
            if item_data.has_iva:
                iva_amount = item_subtotal * Decimal('0.19')
                tax_total += iva_amount
            
            item_discount = (Decimal(str(item_data.original_price)) - Decimal(str(item_data.final_price))) * item_data.quantity
            discount_total += item_discount
            subtotal += item_subtotal
            
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=item_data.product_id,
                product_name=item_data.product_name,
                quantity=item_data.quantity,
                original_price=Decimal(str(item_data.original_price)),
                final_price=Decimal(str(item_data.final_price)),
                discount_amount=Decimal(str(item_data.discount_amount)),
                discount_percent=Decimal(str(item_data.discount_percent)),
                discount_reason=item_data.discount_reason,
                has_iva=item_data.has_iva,
                iva_amount=iva_amount,
                subtotal=item_subtotal + iva_amount
            )
            db.add(sale_item)
            
            if item_data.product_id:
                product = db.query(Product).filter(Product.id == item_data.product_id).with_for_update().first()
                if product:
                    if product.quantity < item_data.quantity:
                        raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product.name}. Disponible: {product.quantity}")
                    old_qty = product.quantity
                    product.quantity -= item_data.quantity
                    
                    movement = StockMovement(
                        product_id=product.id,
                        user_id=current_user.id,
                        movement_type="sale",
                        quantity=-item_data.quantity,
                        previous_quantity=old_qty,
                        new_quantity=product.quantity,
                        reason=f"Venta {sale_number}",
                        reference_id=sale.id,
                        reference_type="sale"
                    )
                    db.add(movement)
        
        total = subtotal - Decimal(str(sale_data.global_discount))
        sale.subtotal = subtotal
        sale.tax_total = tax_total
        sale.discount_total = discount_total
        sale.total = total
        
        total_payments = sum(Decimal(str(p.amount)) for p in sale_data.payments)
        
        if total_payments < total:
            raise HTTPException(status_code=400, detail="El pago no cubre el total de la venta")
        
        if total_payments > total:
            raise HTTPException(status_code=400, detail=f"El pago (${total_payments}) excede el total de la venta (${total})")
        
        for payment_data in sale_data.payments:
            payment = Payment(
                sale_id=sale.id,
                cash_register_id=payment_data.cash_register_id,
                payment_method=payment_data.payment_method.value,
                amount=Decimal(str(payment_data.amount))
            )
            db.add(payment)
            
            register = db.query(CashRegister).filter(CashRegister.id == payment_data.cash_register_id).with_for_update().first()
            if register:
                register.current_balance += Decimal(str(payment_data.amount))
        
        audit = AuditLog(
            user_id=current_user.id,
            action="create_sale",
            entity_type="sale",
            entity_id=sale.id,
            new_values=f"Sale {sale_number} - Total: ${total}"
        )
        db.add(audit)
        
        db.commit()
        db.refresh(sale)
        return sale
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar la venta: {str(e)}")

@router.get("/sales", response_model=List[SaleResponse])
def get_sales(
    store_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    user_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Sale)
    
    if store_id:
        query = query.filter(Sale.store_id == store_id)
    if start_date:
        query = query.filter(Sale.created_at >= start_date)
    if end_date:
        query = query.filter(Sale.created_at <= end_date)
    if user_id:
        query = query.filter(Sale.user_id == user_id)
    if search:
        query = query.filter(Sale.sale_number.ilike(f"%{search}%"))
    
    return query.order_by(Sale.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/sales/{sale_id}", response_model=SaleResponse)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale

@router.post("/returns", response_model=ReturnResponse)
def create_return(return_data: ReturnCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sale = db.query(Sale).filter(Sale.id == return_data.sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    try:
        return_record = Return(
            sale_id=return_data.sale_id,
            user_id=current_user.id,
            return_type=return_data.return_type,
            reason=return_data.reason
        )
        db.add(return_record)
        db.flush()
        
        total_refund = Decimal('0')
        
        for item_data in return_data.items:
            sale_item = db.query(SaleItem).filter(SaleItem.id == item_data.sale_item_id).first()
            if not sale_item:
                raise HTTPException(status_code=404, detail=f"Sale item {item_data.sale_item_id} not found")
            
            already_returned = db.query(func.coalesce(func.sum(ReturnItem.quantity), 0)).filter(
                ReturnItem.sale_item_id == item_data.sale_item_id
            ).scalar()
            available_to_return = sale_item.quantity - int(already_returned)
            
            if item_data.quantity > available_to_return:
                raise HTTPException(
                    status_code=400, 
                    detail=f"La devolución ({item_data.quantity}) excede lo disponible ({available_to_return}) para el producto {sale_item.product_name}"
                )
            
            refund_amount = (sale_item.subtotal / sale_item.quantity) * item_data.quantity
            total_refund += refund_amount
            
            return_item = ReturnItem(
                return_id=return_record.id,
                sale_item_id=item_data.sale_item_id,
                quantity=item_data.quantity,
                refund_amount=refund_amount,
                restock=item_data.restock
            )
            db.add(return_item)
            
            if item_data.restock and sale_item.product_id:
                product = db.query(Product).filter(Product.id == sale_item.product_id).with_for_update().first()
                if product:
                    old_qty = product.quantity
                    product.quantity += item_data.quantity
                    
                    movement = StockMovement(
                        product_id=product.id,
                        user_id=current_user.id,
                        movement_type="return",
                        quantity=item_data.quantity,
                        previous_quantity=old_qty,
                        new_quantity=product.quantity,
                        reason=f"Devolución de venta {sale.sale_number}",
                        reference_id=return_record.id,
                        reference_type="return"
                    )
                    db.add(movement)
        
        return_record.total_refund = total_refund
        
        for payment in sale.payments:
            refund_amount = (total_refund * Decimal(str(payment.amount))) / Decimal(str(sale.total))
            
            refund_payment = Payment(
                return_id=return_record.id,
                cash_register_id=payment.cash_register_id,
                payment_method=payment.payment_method,
                amount=refund_amount,
                is_refund=True
            )
            db.add(refund_payment)
            
            register = db.query(CashRegister).filter(CashRegister.id == payment.cash_register_id).with_for_update().first()
            if register:
                if register.current_balance < refund_amount:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Saldo insuficiente en {register.name} (${register.current_balance}) para reembolso de ${refund_amount}"
                    )
                register.current_balance -= refund_amount
        
        audit = AuditLog(
            user_id=current_user.id,
            action="create_return",
            entity_type="return",
            entity_id=return_record.id,
            new_values=f"Return for sale {sale.sale_number} - Refund: ${total_refund}"
        )
        db.add(audit)
        
        db.commit()
        db.refresh(return_record)
        return return_record
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar la devolución: {str(e)}")

@router.get("/returns", response_model=List[ReturnResponse])
def get_returns(
    store_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Return).join(Sale)
    
    if store_id:
        query = query.filter(Sale.store_id == store_id)
    if start_date:
        query = query.filter(Return.created_at >= start_date)
    if end_date:
        query = query.filter(Return.created_at <= end_date)
    
    return query.order_by(Return.created_at.desc()).all()

@router.post("/product-transfers", response_model=ProductTransferResponse)
def create_product_transfer(
    transfer_data: ProductTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from_product = db.query(Product).filter(
        Product.id == transfer_data.product_id,
        Product.store_id == transfer_data.from_store_id
    ).with_for_update().first()
    
    if not from_product:
        raise HTTPException(status_code=404, detail="Product not found in source store")
    
    if from_product.quantity < transfer_data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock in source store")
    
    to_product = db.query(Product).filter(
        Product.name == from_product.name,
        Product.store_id == transfer_data.to_store_id
    ).with_for_update().first()
    
    if not to_product:
        to_product = Product(
            store_id=transfer_data.to_store_id,
            name=from_product.name,
            brand=from_product.brand,
            supplier=from_product.supplier,
            sale_price=from_product.sale_price,
            cost=from_product.cost,
            has_iva=from_product.has_iva,
            quantity=0,
            presentation=from_product.presentation,
            weight_volume=from_product.weight_volume,
            expiration_date=from_product.expiration_date,
            min_stock=from_product.min_stock
        )
        db.add(to_product)
        db.flush()
    
    transfer = ProductTransfer(
        product_id=transfer_data.product_id,
        from_store_id=transfer_data.from_store_id,
        to_store_id=transfer_data.to_store_id,
        user_id=current_user.id,
        quantity=transfer_data.quantity,
        reason=transfer_data.reason
    )
    db.add(transfer)
    
    old_from_qty = from_product.quantity
    from_product.quantity -= transfer_data.quantity
    
    movement_out = StockMovement(
        product_id=from_product.id,
        user_id=current_user.id,
        movement_type="transfer_out",
        quantity=-transfer_data.quantity,
        previous_quantity=old_from_qty,
        new_quantity=from_product.quantity,
        reason=f"Traspaso a tienda destino",
        reference_id=transfer.id,
        reference_type="product_transfer"
    )
    db.add(movement_out)
    
    old_to_qty = to_product.quantity
    to_product.quantity += transfer_data.quantity
    
    movement_in = StockMovement(
        product_id=to_product.id,
        user_id=current_user.id,
        movement_type="transfer_in",
        quantity=transfer_data.quantity,
        previous_quantity=old_to_qty,
        new_quantity=to_product.quantity,
        reason=f"Traspaso desde tienda origen",
        reference_id=transfer.id,
        reference_type="product_transfer"
    )
    db.add(movement_in)
    
    db.commit()
    db.refresh(transfer)
    return transfer

@router.get("/product-transfers", response_model=List[ProductTransferResponse])
def get_product_transfers(
    from_store_id: Optional[int] = None,
    to_store_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProductTransfer)
    
    if from_store_id:
        query = query.filter(ProductTransfer.from_store_id == from_store_id)
    if to_store_id:
        query = query.filter(ProductTransfer.to_store_id == to_store_id)
    if start_date:
        query = query.filter(ProductTransfer.created_at >= start_date)
    if end_date:
        query = query.filter(ProductTransfer.created_at <= end_date)
    
    transfers = query.order_by(ProductTransfer.created_at.desc()).all()
    
    result = []
    for transfer in transfers:
        product = db.query(Product).filter(Product.id == transfer.product_id).first()
        transfer_dict = {
            "id": transfer.id,
            "product_id": transfer.product_id,
            "product_name": product.name if product else None,
            "from_store_id": transfer.from_store_id,
            "to_store_id": transfer.to_store_id,
            "user_id": transfer.user_id,
            "quantity": transfer.quantity,
            "reason": transfer.reason,
            "created_at": transfer.created_at
        }
        result.append(transfer_dict)
    
    return result

@router.post("/expenses", response_model=ExpenseResponse)
def create_expense(expense_data: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    register = db.query(CashRegister).filter(CashRegister.id == expense_data.cash_register_id).with_for_update().first()
    if not register:
        raise HTTPException(status_code=404, detail="Caja no encontrada")
    
    expense_amount = Decimal(str(expense_data.amount))
    if register.current_balance < expense_amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Saldo insuficiente en {register.name} (${register.current_balance}) para gasto de ${expense_amount}"
        )
    
    try:
        expense = Expense(
            store_id=expense_data.store_id,
            user_id=current_user.id,
            cash_register_id=expense_data.cash_register_id,
            payment_method=expense_data.payment_method.value,
            amount=expense_amount,
            description=expense_data.description
        )
        db.add(expense)
        
        register.current_balance -= expense_amount
        
        db.flush()
        
        audit = AuditLog(
            user_id=current_user.id,
            action="create_expense",
            entity_type="expense",
            entity_id=expense.id,
            new_values=f"Expense: ${expense_data.amount} - {expense_data.description}"
        )
        db.add(audit)
        
        db.commit()
        db.refresh(expense)
        return expense
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear el gasto: {str(e)}")

@router.get("/expenses", response_model=List[ExpenseResponse])
def get_expenses(
    store_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Expense)
    
    if store_id:
        query = query.filter(Expense.store_id == store_id)
    if start_date:
        query = query.filter(Expense.created_at >= start_date)
    if end_date:
        query = query.filter(Expense.created_at <= end_date)
    
    return query.order_by(Expense.created_at.desc()).all()

@router.post("/cash-transfers", response_model=CashTransferResponse)
def create_cash_transfer(
    transfer_data: CashTransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from_register = db.query(CashRegister).filter(CashRegister.id == transfer_data.from_register_id).with_for_update().first()
    to_register = db.query(CashRegister).filter(CashRegister.id == transfer_data.to_register_id).with_for_update().first()
    
    if not from_register or not to_register:
        raise HTTPException(status_code=404, detail="Caja no encontrada")
    
    transfer_amount = Decimal(str(transfer_data.amount))
    if from_register.current_balance < transfer_amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Saldo insuficiente en {from_register.name} (${from_register.current_balance}) para transferencia de ${transfer_amount}"
        )
    
    if from_register.payment_method == "efectivo" and to_register.payment_method == "efectivo":
        if from_register.store_id != to_register.store_id and not from_register.is_global and not to_register.is_global:
            raise HTTPException(status_code=400, detail="No se puede transferir efectivo entre tiendas diferentes")
    
    try:
        transfer = CashTransfer(
            from_register_id=transfer_data.from_register_id,
            to_register_id=transfer_data.to_register_id,
            user_id=current_user.id,
            amount=Decimal(str(transfer_data.amount)),
            note=transfer_data.note
        )
        db.add(transfer)
        
        from_register.current_balance -= Decimal(str(transfer_data.amount))
        to_register.current_balance += Decimal(str(transfer_data.amount))
        
        db.flush()
        
        audit = AuditLog(
            user_id=current_user.id,
            action="create_cash_transfer",
            entity_type="cash_transfer",
            entity_id=transfer.id,
            new_values=f"Transfer: ${transfer_data.amount} from {from_register.name} to {to_register.name}"
        )
        db.add(audit)
        
        db.commit()
        db.refresh(transfer)
        return transfer
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar la transferencia: {str(e)}")

@router.get("/cash-transfers", response_model=List[CashTransferResponse])
def get_cash_transfers(
    store_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CashTransfer)
    
    if start_date:
        query = query.filter(CashTransfer.created_at >= start_date)
    if end_date:
        query = query.filter(CashTransfer.created_at <= end_date)
    
    return query.order_by(CashTransfer.created_at.desc()).all()

@router.post("/cash-openings", response_model=CashOpeningResponse)
def create_cash_opening(
    opening_data: CashOpeningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.now().date()
    existing = db.query(CashOpening).filter(
        CashOpening.store_id == opening_data.store_id,
        func.date(CashOpening.opening_date) == today
    ).all()
    
    for opening in existing:
        has_closing = db.query(CashClosing).filter(CashClosing.opening_id == opening.id).first()
        if not has_closing:
            raise HTTPException(status_code=400, detail="Ya existe una apertura de caja abierta hoy. Debe cerrarla primero.")
    
    try:
        opening = CashOpening(
            store_id=opening_data.store_id,
            user_id=current_user.id,
            opening_date=datetime.now(),
            initial_balance=Decimal(str(opening_data.initial_balance)),
            notes=opening_data.notes
        )
        db.add(opening)
        db.flush()
        
        audit = AuditLog(
            user_id=current_user.id,
            action="create_cash_opening",
            entity_type="cash_opening",
            entity_id=opening.id,
            new_values=f"Opening: ${opening_data.initial_balance}"
        )
        db.add(audit)
        
        db.commit()
        db.refresh(opening)
        return opening
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear la apertura de caja: {str(e)}")

@router.get("/cash-openings", response_model=List[CashOpeningResponse])
def get_cash_openings(
    store_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CashOpening)
    
    if store_id:
        query = query.filter(CashOpening.store_id == store_id)
    if start_date:
        query = query.filter(CashOpening.opening_date >= start_date)
    if end_date:
        query = query.filter(CashOpening.opening_date <= end_date)
    
    return query.order_by(CashOpening.opening_date.desc()).all()

@router.get("/cash-openings/today/{store_id}", response_model=Optional[CashOpeningResponse])
def get_today_opening(store_id: int, db: Session = Depends(get_db)):
    today = datetime.now().date()
    openings = db.query(CashOpening).filter(
        CashOpening.store_id == store_id,
        func.date(CashOpening.opening_date) == today
    ).order_by(CashOpening.opening_date.desc()).all()
    
    for opening in openings:
        has_closing = db.query(CashClosing).filter(CashClosing.opening_id == opening.id).first()
        if not has_closing:
            return opening
    
    return None

@router.put("/cash-openings/{opening_id}", response_model=CashOpeningResponse)
def update_cash_opening(
    opening_id: int,
    update_data: CashOpeningUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    opening = db.query(CashOpening).filter(CashOpening.id == opening_id).first()
    if not opening:
        raise HTTPException(status_code=404, detail="Opening not found")
    
    existing_closing = db.query(CashClosing).filter(CashClosing.opening_id == opening_id).first()
    if existing_closing:
        raise HTTPException(status_code=400, detail="No se puede modificar una apertura que ya tiene cierre")
    
    if update_data.initial_balance is not None:
        opening.initial_balance = Decimal(str(update_data.initial_balance))
    if update_data.notes is not None:
        opening.notes = update_data.notes
    
    audit = AuditLog(
        user_id=current_user.id,
        action="update_cash_opening",
        entity_type="cash_opening",
        entity_id=opening.id,
        new_values=f"Updated: balance={update_data.initial_balance}, notes={update_data.notes}"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(opening)
    return opening

@router.post("/cash-closings", response_model=CashClosingResponse)
def create_cash_closing(
    closing_data: CashClosingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    opening = db.query(CashOpening).filter(CashOpening.id == closing_data.opening_id).first()
    if not opening:
        raise HTTPException(status_code=404, detail="No se encontró la apertura de caja especificada")
    
    if opening.store_id != closing_data.store_id:
        raise HTTPException(status_code=400, detail="La apertura no corresponde a esta tienda")
    
    existing = db.query(CashClosing).filter(CashClosing.opening_id == closing_data.opening_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un cierre para esta apertura")
    
    total_sales = db.query(func.coalesce(func.sum(Sale.total), 0)).filter(
        Sale.store_id == closing_data.store_id,
        Sale.created_at >= opening.opening_date,
        Sale.created_at <= datetime.now()
    ).scalar()
    
    total_expenses = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.store_id == closing_data.store_id,
        Expense.created_at >= opening.opening_date,
        Expense.created_at <= datetime.now()
    ).scalar()
    
    store_register_ids = db.query(CashRegister.id).filter(
        CashRegister.store_id == closing_data.store_id
    ).subquery()
    
    total_transfers_in = db.query(func.coalesce(func.sum(CashTransfer.amount), 0)).filter(
        CashTransfer.to_register_id.in_(store_register_ids),
        CashTransfer.created_at >= opening.opening_date,
        CashTransfer.created_at <= datetime.now()
    ).scalar()
    
    total_transfers_out = db.query(func.coalesce(func.sum(CashTransfer.amount), 0)).filter(
        CashTransfer.from_register_id.in_(store_register_ids),
        CashTransfer.created_at >= opening.opening_date,
        CashTransfer.created_at <= datetime.now()
    ).scalar()
    
    expected_balance = (
        Decimal(str(opening.initial_balance)) +
        Decimal(str(total_sales)) -
        Decimal(str(total_expenses)) +
        Decimal(str(total_transfers_in)) -
        Decimal(str(total_transfers_out))
    )
    
    difference = Decimal(str(closing_data.actual_balance)) - expected_balance
    
    try:
        closing = CashClosing(
            opening_id=closing_data.opening_id,
            store_id=closing_data.store_id,
            user_id=current_user.id,
            closing_date=datetime.now(),
            expected_balance=expected_balance,
            actual_balance=Decimal(str(closing_data.actual_balance)),
            difference=difference,
            total_sales=Decimal(str(total_sales)),
            total_expenses=Decimal(str(total_expenses)),
            total_transfers_in=Decimal(str(total_transfers_in)),
            total_transfers_out=Decimal(str(total_transfers_out)),
            notes=closing_data.notes
        )
        db.add(closing)
        db.flush()
        
        audit = AuditLog(
            user_id=current_user.id,
            action="create_cash_closing",
            entity_type="cash_closing",
            entity_id=closing.id,
            new_values=f"Closing: Expected ${expected_balance}, Actual ${closing_data.actual_balance}, Diff ${difference}"
        )
        db.add(audit)
        
        db.commit()
        db.refresh(closing)
        return closing
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear el cierre de caja: {str(e)}")

@router.get("/cash-closings", response_model=List[CashClosingResponse])
def get_cash_closings(
    store_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CashClosing)
    
    if store_id:
        query = query.filter(CashClosing.store_id == store_id)
    if start_date:
        query = query.filter(CashClosing.closing_date >= start_date)
    if end_date:
        query = query.filter(CashClosing.closing_date <= end_date)
    
    return query.order_by(CashClosing.closing_date.desc()).all()

@router.put("/cash-closings/{closing_id}", response_model=CashClosingResponse)
def update_cash_closing(
    closing_id: int,
    update_data: CashClosingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    closing = db.query(CashClosing).filter(CashClosing.id == closing_id).first()
    if not closing:
        raise HTTPException(status_code=404, detail="Cierre no encontrado")
    
    opening = db.query(CashOpening).filter(CashOpening.id == closing.opening_id).first()
    
    if update_data.actual_balance is not None:
        new_actual = Decimal(str(update_data.actual_balance))
        closing.actual_balance = new_actual
        closing.difference = new_actual - closing.expected_balance
    
    if update_data.notes is not None:
        closing.notes = update_data.notes
    
    db.commit()
    db.refresh(closing)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="update_cash_closing",
        entity_type="cash_closing",
        entity_id=closing.id,
        new_values=f"Updated: balance={update_data.actual_balance}, notes={update_data.notes}"
    )
    db.add(audit)
    db.commit()
    
    return closing

@router.get("/alerts", response_model=List[AlertResponse])
def get_alerts(
    store_id: Optional[int] = None,
    unread_only: bool = False,
    db: Session = Depends(get_db)
):
    run_all_alerts(db)
    
    query = db.query(Alert).filter(Alert.is_resolved == False)
    
    if store_id:
        query = query.filter((Alert.store_id == store_id) | (Alert.store_id == None))
    if unread_only:
        query = query.filter(Alert.is_read == False)
    
    return query.order_by(Alert.created_at.desc()).all()

@router.put("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_read = True
    db.commit()
    return {"message": "Alert marked as read"}

@router.put("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_resolved = True
    db.commit()
    return {"message": "Alert resolved"}

@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(store_id: Optional[int] = None, db: Session = Depends(get_db)):
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    sales_query = db.query(func.coalesce(func.sum(Sale.total), 0))
    expenses_query = db.query(func.coalesce(func.sum(Expense.amount), 0))
    sales_count_query = db.query(func.count(Sale.id))
    
    if store_id:
        sales_query = sales_query.filter(Sale.store_id == store_id)
        expenses_query = expenses_query.filter(Expense.store_id == store_id)
        sales_count_query = sales_count_query.filter(Sale.store_id == store_id)
    
    total_sales_today = sales_query.filter(func.date(Sale.created_at) == today).scalar()
    total_sales_week = sales_query.filter(Sale.created_at >= week_ago).scalar()
    total_sales_month = sales_query.filter(Sale.created_at >= month_ago).scalar()
    
    total_expenses_today = expenses_query.filter(func.date(Expense.created_at) == today).scalar()
    total_expenses_week = expenses_query.filter(Expense.created_at >= week_ago).scalar()
    total_expenses_month = expenses_query.filter(Expense.created_at >= month_ago).scalar()
    
    sales_count_today = sales_count_query.filter(func.date(Sale.created_at) == today).scalar()
    sales_count_week = sales_count_query.filter(Sale.created_at >= week_ago).scalar()
    sales_count_month = sales_count_query.filter(Sale.created_at >= month_ago).scalar()
    
    cost_base_query = db.query(
        func.coalesce(func.sum(Product.cost * SaleItem.quantity), 0)
    ).select_from(SaleItem).join(Sale).outerjoin(
        Product, SaleItem.product_id == Product.id
    )
    
    if store_id:
        cost_base_query = cost_base_query.filter(Sale.store_id == store_id)
    
    cost_today = Decimal(str(cost_base_query.filter(func.date(Sale.created_at) == today).scalar() or 0))
    cost_week = Decimal(str(cost_base_query.filter(Sale.created_at >= week_ago).scalar() or 0))
    cost_month = Decimal(str(cost_base_query.filter(Sale.created_at >= month_ago).scalar() or 0))
    
    profit_today = Decimal(str(total_sales_today or 0)) - cost_today - Decimal(str(total_expenses_today or 0))
    profit_week = Decimal(str(total_sales_week or 0)) - cost_week - Decimal(str(total_expenses_week or 0))
    profit_month = Decimal(str(total_sales_month or 0)) - cost_month - Decimal(str(total_expenses_month or 0))
    
    average_ticket = Decimal('0')
    if sales_count_month and sales_count_month > 0:
        average_ticket = Decimal(str(total_sales_month or 0)) / Decimal(str(sales_count_month))
    
    products_query = db.query(Product).filter(Product.is_active == True)
    if store_id:
        products_query = products_query.filter(Product.store_id == store_id)
    
    products_low_stock = products_query.filter(
        Product.quantity <= Product.min_stock,
        Product.quantity > 0
    ).count()
    
    products_out_of_stock = products_query.filter(Product.quantity == 0).count()
    
    expiration_threshold = datetime.now() + timedelta(days=30)
    products_expiring_soon = products_query.filter(
        Product.expiration_date != None,
        Product.expiration_date <= expiration_threshold
    ).count()
    
    inventory_value = Decimal(str(products_query.with_entities(
        func.coalesce(func.sum(Product.cost * Product.quantity), 0)
    ).scalar() or 0))
    
    alerts_query = db.query(Alert).filter(Alert.is_read == False, Alert.is_resolved == False)
    if store_id:
        alerts_query = alerts_query.filter((Alert.store_id == store_id) | (Alert.store_id == None))
    unread_alerts = alerts_query.count()
    
    return DashboardStats(
        total_sales_today=Decimal(str(total_sales_today or 0)),
        total_sales_week=Decimal(str(total_sales_week or 0)),
        total_sales_month=Decimal(str(total_sales_month or 0)),
        total_expenses_today=Decimal(str(total_expenses_today or 0)),
        total_expenses_week=Decimal(str(total_expenses_week or 0)),
        total_expenses_month=Decimal(str(total_expenses_month or 0)),
        products_low_stock=products_low_stock,
        products_out_of_stock=products_out_of_stock,
        products_expiring_soon=products_expiring_soon,
        unread_alerts=unread_alerts,
        profit_today=profit_today,
        profit_week=profit_week,
        profit_month=profit_month,
        cost_today=cost_today,
        cost_week=cost_week,
        cost_month=cost_month,
        sales_count_today=sales_count_today or 0,
        sales_count_week=sales_count_week or 0,
        sales_count_month=sales_count_month or 0,
        average_ticket=average_ticket,
        inventory_value=inventory_value
    )

@router.get("/dashboard/advanced-stats", response_model=AdvancedStats)
def get_advanced_stats(
    store_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden ver estadísticas avanzadas")
    
    month_ago = datetime.now() - timedelta(days=30)
    
    payment_query = db.query(
        Payment.payment_method,
        func.sum(Payment.amount).label('total'),
        func.count(Payment.id).label('count')
    ).join(Sale).filter(Sale.created_at >= month_ago)
    
    if store_id:
        payment_query = payment_query.filter(Sale.store_id == store_id)
    
    payment_results = payment_query.group_by(Payment.payment_method).all()
    
    total_payments = sum(Decimal(str(r.total or 0)) for r in payment_results)
    payment_stats = []
    for r in payment_results:
        pct = (Decimal(str(r.total or 0)) / total_payments * 100) if total_payments > 0 else Decimal('0')
        payment_stats.append(PaymentMethodStats(
            payment_method=r.payment_method,
            total_amount=Decimal(str(r.total or 0)),
            transaction_count=r.count,
            percentage=round(float(pct), 1)
        ))
    
    stores_query = db.query(Store).filter(Store.is_active == True)
    if store_id:
        stores_query = stores_query.filter(Store.id == store_id)
    stores = stores_query.all()
    store_stats = []
    for store in stores:
        sales_total = db.query(func.coalesce(func.sum(Sale.total), 0)).filter(
            Sale.store_id == store.id,
            Sale.created_at >= month_ago
        ).scalar()
        expenses_total = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.store_id == store.id,
            Expense.created_at >= month_ago
        ).scalar()
        sales_count = db.query(func.count(Sale.id)).filter(
            Sale.store_id == store.id,
            Sale.created_at >= month_ago
        ).scalar()
        
        cost_total = Decimal(str(db.query(
            func.coalesce(func.sum(Product.cost * SaleItem.quantity), 0)
        ).select_from(SaleItem).join(Sale).outerjoin(
            Product, SaleItem.product_id == Product.id
        ).filter(
            Sale.store_id == store.id,
            Sale.created_at >= month_ago
        ).scalar() or 0))
        
        profit = Decimal(str(sales_total or 0)) - cost_total - Decimal(str(expenses_total or 0))
        
        store_stats.append(StoreStats(
            store_id=store.id,
            store_name=store.name,
            total_sales=Decimal(str(sales_total or 0)),
            total_expenses=Decimal(str(expenses_total or 0)),
            profit=profit,
            sales_count=sales_count or 0
        ))
    
    top_products_query = db.query(
        SaleItem.product_id,
        SaleItem.product_name,
        func.sum(SaleItem.quantity).label('qty'),
        func.sum(SaleItem.subtotal).label('revenue')
    ).join(Sale).filter(Sale.created_at >= month_ago)
    
    if store_id:
        top_products_query = top_products_query.filter(Sale.store_id == store_id)
    
    top_results = top_products_query.group_by(
        SaleItem.product_id, SaleItem.product_name
    ).order_by(func.sum(SaleItem.quantity).desc()).limit(10).all()
    
    top_products = [TopProduct(
        product_id=r.product_id or 0,
        product_name=r.product_name,
        quantity_sold=int(r.qty or 0),
        total_revenue=Decimal(str(r.revenue or 0))
    ) for r in top_results]
    
    least_results = top_products_query.group_by(
        SaleItem.product_id, SaleItem.product_name
    ).order_by(func.sum(SaleItem.quantity).asc()).limit(10).all()
    
    least_sold = [TopProduct(
        product_id=r.product_id or 0,
        product_name=r.product_name,
        quantity_sold=int(r.qty or 0),
        total_revenue=Decimal(str(r.revenue or 0))
    ) for r in least_results]
    
    return AdvancedStats(
        payment_methods=payment_stats,
        stores=store_stats,
        top_products=top_products,
        least_sold_products=least_sold
    )

@router.get("/reports/sales/export")
def export_sales_report(
    format: str = Query("excel", enum=["excel", "pdf"]),
    store_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Sale)
    if store_id:
        query = query.filter(Sale.store_id == store_id)
    if start_date:
        query = query.filter(Sale.created_at >= start_date)
    if end_date:
        query = query.filter(Sale.created_at <= end_date)
    
    sales = query.order_by(Sale.created_at.desc()).all()
    headers, data = generate_sales_report_data(sales)
    
    if format == "excel":
        content = export_to_excel(data, headers, "Reporte de Ventas")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=ventas.xlsx"}
        )
    else:
        content = export_to_pdf(data, headers, "Reporte de Ventas")
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=ventas.pdf"}
        )

@router.get("/reports/inventory/export")
def export_inventory_report(
    format: str = Query("excel", enum=["excel", "pdf"]),
    store_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.is_active == True)
    if store_id:
        query = query.filter(Product.store_id == store_id)
    
    products = query.order_by(Product.name).all()
    headers, data = generate_inventory_report_data(products)
    
    if format == "excel":
        content = export_to_excel(data, headers, "Reporte de Inventario")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=inventario.xlsx"}
        )
    else:
        content = export_to_pdf(data, headers, "Reporte de Inventario")
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=inventario.pdf"}
        )

@router.get("/reports/expenses/export")
def export_expenses_report(
    format: str = Query("excel", enum=["excel", "pdf"]),
    store_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Expense)
    if store_id:
        query = query.filter(Expense.store_id == store_id)
    if start_date:
        query = query.filter(Expense.created_at >= start_date)
    if end_date:
        query = query.filter(Expense.created_at <= end_date)
    
    expenses = query.order_by(Expense.created_at.desc()).all()
    headers, data = generate_expenses_report_data(expenses)
    
    if format == "excel":
        content = export_to_excel(data, headers, "Reporte de Egresos")
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=egresos.xlsx"}
        )
    else:
        content = export_to_pdf(data, headers, "Reporte de Egresos")
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=egresos.pdf"}
        )

@router.get("/reports/closing/{closing_id}/export")
def export_closing_report(closing_id: int, db: Session = Depends(get_db)):
    closing = db.query(CashClosing).filter(CashClosing.id == closing_id).first()
    if not closing:
        raise HTTPException(status_code=404, detail="Closing not found")
    
    opening = db.query(CashOpening).filter(CashOpening.id == closing.opening_id).first()
    
    sales = db.query(Sale).filter(
        Sale.store_id == closing.store_id,
        Sale.created_at >= opening.opening_date,
        Sale.created_at <= closing.closing_date
    ).all()
    
    expenses = db.query(Expense).filter(
        Expense.store_id == closing.store_id,
        Expense.created_at >= opening.opening_date,
        Expense.created_at <= closing.closing_date
    ).all()
    
    content = generate_cash_closing_report(closing, opening, sales, expenses, [], [])
    
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=cierre_{closing_id}.pdf"}
    )

@router.get("/suppliers", response_model=List[SupplierResponse])
def get_suppliers(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(Supplier)
    if active_only:
        query = query.filter(Supplier.is_active == True)
    suppliers = query.order_by(Supplier.name).all()
    
    result = []
    for s in suppliers:
        pending = db.query(func.sum(SupplierInvoice.total_amount - SupplierInvoice.paid_amount)).filter(
            SupplierInvoice.supplier_id == s.id,
            SupplierInvoice.status.in_(["pendiente", "parcial", "vencida"])
        ).scalar() or 0
        
        invoices_count = db.query(SupplierInvoice).filter(SupplierInvoice.supplier_id == s.id).count()
        
        result.append(SupplierResponse(
            id=s.id,
            name=s.name,
            contact_name=s.contact_name,
            phone=s.phone,
            email=s.email,
            address=s.address,
            notes=s.notes,
            is_active=s.is_active,
            created_at=s.created_at,
            updated_at=s.updated_at,
            invoices_count=invoices_count,
            pending_amount=Decimal(str(pending))
        ))
    return result

@router.post("/suppliers", response_model=SupplierResponse)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_supplier = Supplier(**supplier.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return SupplierResponse(
        id=db_supplier.id,
        name=db_supplier.name,
        contact_name=db_supplier.contact_name,
        phone=db_supplier.phone,
        email=db_supplier.email,
        address=db_supplier.address,
        notes=db_supplier.notes,
        is_active=db_supplier.is_active,
        created_at=db_supplier.created_at,
        updated_at=db_supplier.updated_at,
        invoices_count=0,
        pending_amount=0
    )

@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    supplier: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = supplier.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_supplier, key, value)
    
    db.commit()
    db.refresh(db_supplier)
    
    pending = db.query(func.sum(SupplierInvoice.total_amount - SupplierInvoice.paid_amount)).filter(
        SupplierInvoice.supplier_id == db_supplier.id,
        SupplierInvoice.status.in_(["pendiente", "parcial", "vencida"])
    ).scalar() or 0
    invoices_count = db.query(SupplierInvoice).filter(SupplierInvoice.supplier_id == db_supplier.id).count()
    
    return SupplierResponse(
        id=db_supplier.id,
        name=db_supplier.name,
        contact_name=db_supplier.contact_name,
        phone=db_supplier.phone,
        email=db_supplier.email,
        address=db_supplier.address,
        notes=db_supplier.notes,
        is_active=db_supplier.is_active,
        created_at=db_supplier.created_at,
        updated_at=db_supplier.updated_at,
        invoices_count=invoices_count,
        pending_amount=Decimal(str(pending))
    )

@router.get("/supplier-invoices", response_model=List[SupplierInvoiceResponse])
def get_supplier_invoices(
    supplier_id: Optional[int] = None,
    status: Optional[str] = None,
    due_soon: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = db.query(SupplierInvoice)
    
    if supplier_id:
        query = query.filter(SupplierInvoice.supplier_id == supplier_id)
    if status:
        query = query.filter(SupplierInvoice.status == status)
    if due_soon:
        soon = datetime.utcnow() + timedelta(days=7)
        query = query.filter(
            SupplierInvoice.due_date <= soon,
            SupplierInvoice.status.in_(["pendiente", "parcial"])
        )
    
    invoices = query.order_by(SupplierInvoice.due_date).all()
    
    # Auto-update status to "vencida" for overdue invoices
    today = datetime.utcnow().date()
    for inv in invoices:
        inv_due_date = inv.due_date.date() if hasattr(inv.due_date, 'date') else inv.due_date
        if inv.status in ["pendiente", "parcial"] and inv_due_date < today:
            inv.status = "vencida"
            db.commit()
    
    result = []
    for inv in invoices:
        supplier = db.query(Supplier).filter(Supplier.id == inv.supplier_id).first()
        payments = db.query(InvoicePayment).filter(InvoicePayment.invoice_id == inv.id).order_by(InvoicePayment.payment_date.desc()).all()
        
        result.append(SupplierInvoiceResponse(
            id=inv.id,
            supplier_id=inv.supplier_id,
            invoice_number=inv.invoice_number,
            issue_date=inv.issue_date,
            due_date=inv.due_date,
            total_amount=Decimal(str(inv.total_amount)),
            paid_amount=Decimal(str(inv.paid_amount)),
            payment_type=inv.payment_type,
            status=inv.status,
            image_url=inv.image_url,
            notes=inv.notes,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
            supplier_name=supplier.name if supplier else "",
            remaining_amount=Decimal(str(inv.total_amount)) - Decimal(str(inv.paid_amount)),
            payments=[InvoicePaymentResponse(
                id=p.id,
                invoice_id=p.invoice_id,
                amount=Decimal(str(p.amount)),
                payment_date=p.payment_date,
                payment_method=p.payment_method,
                reference=p.reference,
                notes=p.notes,
                created_at=p.created_at
            ) for p in payments]
        ))
    return result

@router.post("/supplier-invoices", response_model=SupplierInvoiceResponse)
def create_supplier_invoice(
    invoice: SupplierInvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    supplier = db.query(Supplier).filter(Supplier.id == invoice.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    db_invoice = SupplierInvoice(
        supplier_id=invoice.supplier_id,
        invoice_number=invoice.invoice_number,
        issue_date=invoice.issue_date,
        due_date=invoice.due_date,
        total_amount=invoice.total_amount,
        payment_type=invoice.payment_type,
        notes=invoice.notes,
        status="pendiente"
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    
    return SupplierInvoiceResponse(
        id=db_invoice.id,
        supplier_id=db_invoice.supplier_id,
        invoice_number=db_invoice.invoice_number,
        issue_date=db_invoice.issue_date,
        due_date=db_invoice.due_date,
        total_amount=Decimal(str(db_invoice.total_amount)),
        paid_amount=Decimal('0'),
        payment_type=db_invoice.payment_type,
        status=db_invoice.status,
        image_url=db_invoice.image_url,
        notes=db_invoice.notes,
        created_at=db_invoice.created_at,
        updated_at=db_invoice.updated_at,
        supplier_name=supplier.name,
        remaining_amount=Decimal(str(db_invoice.total_amount)),
        payments=[]
    )

@router.put("/supplier-invoices/{invoice_id}", response_model=SupplierInvoiceResponse)
def update_supplier_invoice(
    invoice_id: int,
    invoice: SupplierInvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_invoice = db.query(SupplierInvoice).filter(SupplierInvoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = invoice.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_invoice, key, value)
    
    db.commit()
    db.refresh(db_invoice)
    
    supplier = db.query(Supplier).filter(Supplier.id == db_invoice.supplier_id).first()
    payments = db.query(InvoicePayment).filter(InvoicePayment.invoice_id == db_invoice.id).all()
    
    return SupplierInvoiceResponse(
        id=db_invoice.id,
        supplier_id=db_invoice.supplier_id,
        invoice_number=db_invoice.invoice_number,
        issue_date=db_invoice.issue_date,
        due_date=db_invoice.due_date,
        total_amount=Decimal(str(db_invoice.total_amount)),
        paid_amount=Decimal(str(db_invoice.paid_amount)),
        payment_type=db_invoice.payment_type,
        status=db_invoice.status,
        image_url=db_invoice.image_url,
        notes=db_invoice.notes,
        created_at=db_invoice.created_at,
        updated_at=db_invoice.updated_at,
        supplier_name=supplier.name if supplier else "",
        remaining_amount=Decimal(str(db_invoice.total_amount)) - Decimal(str(db_invoice.paid_amount)),
        payments=[InvoicePaymentResponse(
            id=p.id,
            invoice_id=p.invoice_id,
            amount=Decimal(str(p.amount)),
            payment_date=p.payment_date,
            payment_method=p.payment_method,
            reference=p.reference,
            notes=p.notes,
            created_at=p.created_at
        ) for p in payments]
    )

@router.post("/supplier-invoices/{invoice_id}/payments", response_model=SupplierInvoiceResponse)
def add_invoice_payment(
    invoice_id: int,
    payment: InvoicePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_invoice = db.query(SupplierInvoice).filter(SupplierInvoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    remaining = Decimal(str(db_invoice.total_amount)) - Decimal(str(db_invoice.paid_amount))
    if Decimal(str(payment.amount)) > remaining:
        raise HTTPException(status_code=400, detail=f"Payment amount exceeds remaining balance of {remaining}")
    
    try:
        db_payment = InvoicePayment(
            invoice_id=invoice_id,
            amount=Decimal(str(payment.amount)),
            payment_method=payment.payment_method,
            reference=payment.reference,
            notes=payment.notes
        )
        db.add(db_payment)
        
        db_invoice.paid_amount = Decimal(str(db_invoice.paid_amount)) + Decimal(str(payment.amount))
        
        if Decimal(str(db_invoice.paid_amount)) >= Decimal(str(db_invoice.total_amount)):
            db_invoice.status = "pagada"
        elif Decimal(str(db_invoice.paid_amount)) > 0:
            db_invoice.status = "parcial"
        
        db.commit()
        db.refresh(db_invoice)
        
        supplier = db.query(Supplier).filter(Supplier.id == db_invoice.supplier_id).first()
        payments = db.query(InvoicePayment).filter(InvoicePayment.invoice_id == db_invoice.id).order_by(InvoicePayment.payment_date.desc()).all()
        
        return SupplierInvoiceResponse(
            id=db_invoice.id,
            supplier_id=db_invoice.supplier_id,
            invoice_number=db_invoice.invoice_number,
            issue_date=db_invoice.issue_date,
            due_date=db_invoice.due_date,
            total_amount=Decimal(str(db_invoice.total_amount)),
            paid_amount=Decimal(str(db_invoice.paid_amount)),
            payment_type=db_invoice.payment_type,
            status=db_invoice.status,
            image_url=db_invoice.image_url,
            notes=db_invoice.notes,
            created_at=db_invoice.created_at,
            updated_at=db_invoice.updated_at,
            supplier_name=supplier.name if supplier else "",
            remaining_amount=Decimal(str(db_invoice.total_amount)) - Decimal(str(db_invoice.paid_amount)),
            payments=[InvoicePaymentResponse(
                id=p.id,
                invoice_id=p.invoice_id,
                amount=Decimal(str(p.amount)),
                payment_date=p.payment_date,
                payment_method=p.payment_method,
                reference=p.reference,
                notes=p.notes,
                created_at=p.created_at
            ) for p in payments]
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar el pago: {str(e)}")

@router.get("/supplier-invoices/summary", response_model=SupplierInvoiceSummary)
def get_invoice_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    now = datetime.utcnow()
    soon = now + timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    pending = db.query(func.sum(SupplierInvoice.total_amount - SupplierInvoice.paid_amount)).filter(
        SupplierInvoice.status.in_(["pendiente", "parcial"])
    ).scalar() or 0
    
    overdue = db.query(func.sum(SupplierInvoice.total_amount - SupplierInvoice.paid_amount)).filter(
        SupplierInvoice.status == "vencida"
    ).scalar() or 0
    
    paid_this_month = db.query(func.sum(InvoicePayment.amount)).filter(
        InvoicePayment.payment_date >= month_start
    ).scalar() or 0
    
    pending_count = db.query(SupplierInvoice).filter(
        SupplierInvoice.status.in_(["pendiente", "parcial"])
    ).count()
    
    overdue_count = db.query(SupplierInvoice).filter(
        SupplierInvoice.status == "vencida"
    ).count()
    
    due_soon_count = db.query(SupplierInvoice).filter(
        SupplierInvoice.due_date <= soon,
        SupplierInvoice.due_date > now,
        SupplierInvoice.status.in_(["pendiente", "parcial"])
    ).count()
    
    return SupplierInvoiceSummary(
        total_pending=Decimal(str(pending)),
        total_overdue=Decimal(str(overdue)),
        total_paid_this_month=Decimal(str(paid_this_month)),
        invoices_pending_count=pending_count,
        invoices_overdue_count=overdue_count,
        invoices_due_soon_count=due_soon_count
    )

@router.post("/supplier-invoices/{invoice_id}/image")
async def upload_invoice_image(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_invoice = db.query(SupplierInvoice).filter(SupplierInvoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Use PUT /supplier-invoices/{id} with image_url field to update image"}

@router.delete("/supplier-invoices/{invoice_id}")
def delete_supplier_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_invoice = db.query(SupplierInvoice).filter(SupplierInvoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db.query(InvoicePayment).filter(InvoicePayment.invoice_id == invoice_id).delete()
    db.delete(db_invoice)
    db.commit()
    
    return {"message": "Invoice deleted successfully"}

@router.post("/backups", response_model=BackupResponse)
def create_manual_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    try:
        backup = create_backup(db, user_id=current_user.id, backup_type="manual")
        
        audit = AuditLog(
            user_id=current_user.id,
            action="create_backup",
            entity_type="backup",
            entity_id=backup.id,
            new_values=f"Backup manual: {backup.filename}"
        )
        db.add(audit)
        db.commit()
        
        return BackupResponse(
            id=backup.id,
            filename=backup.filename,
            filepath=backup.filepath,
            backup_type=backup.backup_type,
            status=backup.status,
            file_size=backup.file_size,
            user_id=backup.user_id,
            error_message=backup.error_message,
            created_at=backup.created_at,
            username=current_user.username
        )
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/backups", response_model=BackupListResponse)
def list_backups(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    backups, total = get_all_backups(db, skip=skip, limit=limit)
    
    backup_responses = []
    for backup in backups:
        user = db.query(User).filter(User.id == backup.user_id).first() if backup.user_id else None
        backup_responses.append(BackupResponse(
            id=backup.id,
            filename=backup.filename,
            filepath=backup.filepath,
            backup_type=backup.backup_type,
            status=backup.status,
            file_size=backup.file_size,
            user_id=backup.user_id,
            error_message=backup.error_message,
            created_at=backup.created_at,
            username=user.username if user else None
        ))
    
    return BackupListResponse(backups=backup_responses, total=total)

@router.get("/backups/latest", response_model=BackupResponse)
def get_latest_backup_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    backup = get_latest_backup(db)
    if not backup:
        raise HTTPException(status_code=404, detail="No hay backups exitosos disponibles")
    
    user = db.query(User).filter(User.id == backup.user_id).first() if backup.user_id else None
    return BackupResponse(
        id=backup.id,
        filename=backup.filename,
        filepath=backup.filepath,
        backup_type=backup.backup_type,
        status=backup.status,
        file_size=backup.file_size,
        user_id=backup.user_id,
        error_message=backup.error_message,
        created_at=backup.created_at,
        username=user.username if user else None
    )

@router.get("/backups/download/latest")
def download_latest_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    backup = get_latest_backup(db)
    if not backup:
        raise HTTPException(status_code=404, detail="No hay backups exitosos disponibles")
    
    if backup.status != "success":
        raise HTTPException(status_code=400, detail="El último backup no está disponible para descarga")
    
    filepath = Path(backup.filepath)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Archivo de backup no encontrado en disco")
    
    audit = AuditLog(
        user_id=current_user.id,
        action="download_backup",
        entity_type="backup",
        entity_id=backup.id,
        new_values=f"Descarga: {backup.filename}"
    )
    db.add(audit)
    db.commit()
    
    return FileResponse(
        path=str(filepath),
        filename=backup.filename,
        media_type="application/gzip"
    )

@router.get("/backups/{backup_id}/download")
def download_backup_by_id(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup no encontrado")
    
    if backup.status != "success":
        raise HTTPException(status_code=400, detail="El backup no está disponible para descarga")
    
    filepath = Path(backup.filepath)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Archivo de backup no encontrado en disco")
    
    audit = AuditLog(
        user_id=current_user.id,
        action="download_backup",
        entity_type="backup",
        entity_id=backup.id,
        new_values=f"Descarga: {backup.filename}"
    )
    db.add(audit)
    db.commit()
    
    return FileResponse(
        path=str(filepath),
        filename=backup.filename,
        media_type="application/gzip"
    )
