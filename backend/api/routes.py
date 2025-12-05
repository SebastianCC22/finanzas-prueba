from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
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
    CashOpening, CashClosing, Alert, AuditLog
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
    CashOpeningCreate, CashOpeningResponse,
    CashClosingCreate, CashClosingResponse,
    AlertResponse, StockMovementResponse, DashboardStats
)
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
            product = db.query(Product).filter(Product.id == item_data.product_id).first()
            if product:
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
    
    total = subtotal + tax_total - Decimal(str(sale_data.global_discount))
    sale.subtotal = subtotal
    sale.tax_total = tax_total
    sale.discount_total = discount_total
    sale.total = total
    
    total_payments = Decimal('0')
    for payment_data in sale_data.payments:
        payment = Payment(
            sale_id=sale.id,
            cash_register_id=payment_data.cash_register_id,
            payment_method=payment_data.payment_method.value,
            amount=Decimal(str(payment_data.amount))
        )
        db.add(payment)
        total_payments += Decimal(str(payment_data.amount))
        
        register = db.query(CashRegister).filter(CashRegister.id == payment_data.cash_register_id).first()
        if register:
            register.current_balance += Decimal(str(payment_data.amount))
    
    if total_payments < total:
        raise HTTPException(status_code=400, detail="El pago no cubre el total de la venta")
    
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
            product = db.query(Product).filter(Product.id == sale_item.product_id).first()
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
        
        register = db.query(CashRegister).filter(CashRegister.id == payment.cash_register_id).first()
        if register:
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
    ).first()
    
    if not from_product:
        raise HTTPException(status_code=404, detail="Product not found in source store")
    
    if from_product.quantity < transfer_data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock in source store")
    
    to_product = db.query(Product).filter(
        Product.name == from_product.name,
        Product.store_id == transfer_data.to_store_id
    ).first()
    
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
    
    return query.order_by(ProductTransfer.created_at.desc()).all()

@router.post("/expenses", response_model=ExpenseResponse)
def create_expense(expense_data: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expense = Expense(
        store_id=expense_data.store_id,
        user_id=current_user.id,
        cash_register_id=expense_data.cash_register_id,
        payment_method=expense_data.payment_method.value,
        amount=Decimal(str(expense_data.amount)),
        description=expense_data.description
    )
    db.add(expense)
    
    register = db.query(CashRegister).filter(CashRegister.id == expense_data.cash_register_id).first()
    if register:
        register.current_balance -= Decimal(str(expense_data.amount))
    
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
    from_register = db.query(CashRegister).filter(CashRegister.id == transfer_data.from_register_id).first()
    to_register = db.query(CashRegister).filter(CashRegister.id == transfer_data.to_register_id).first()
    
    if not from_register or not to_register:
        raise HTTPException(status_code=404, detail="Cash register not found")
    
    if from_register.current_balance < Decimal(str(transfer_data.amount)):
        raise HTTPException(status_code=400, detail="Insufficient funds in source register")
    
    if from_register.payment_method == "efectivo" and to_register.payment_method == "efectivo":
        if from_register.store_id != to_register.store_id and not from_register.is_global and not to_register.is_global:
            raise HTTPException(status_code=400, detail="No se puede transferir efectivo entre tiendas diferentes")
    
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
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una apertura de caja para hoy")
    
    opening = CashOpening(
        store_id=opening_data.store_id,
        user_id=current_user.id,
        opening_date=datetime.now(),
        initial_balance=Decimal(str(opening_data.initial_balance)),
        notes=opening_data.notes
    )
    db.add(opening)
    
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
    opening = db.query(CashOpening).filter(
        CashOpening.store_id == store_id,
        func.date(CashOpening.opening_date) == today
    ).first()
    return opening

@router.post("/cash-closings", response_model=CashClosingResponse)
def create_cash_closing(
    closing_data: CashClosingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    opening = db.query(CashOpening).filter(CashOpening.id == closing_data.opening_id).first()
    if not opening:
        raise HTTPException(status_code=404, detail="Opening not found")
    
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
    
    if store_id:
        sales_query = sales_query.filter(Sale.store_id == store_id)
        expenses_query = expenses_query.filter(Expense.store_id == store_id)
    
    total_sales_today = sales_query.filter(func.date(Sale.created_at) == today).scalar()
    total_sales_week = sales_query.filter(Sale.created_at >= week_ago).scalar()
    total_sales_month = sales_query.filter(Sale.created_at >= month_ago).scalar()
    total_expenses_today = expenses_query.filter(func.date(Expense.created_at) == today).scalar()
    
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
    
    alerts_query = db.query(Alert).filter(Alert.is_read == False, Alert.is_resolved == False)
    if store_id:
        alerts_query = alerts_query.filter((Alert.store_id == store_id) | (Alert.store_id == None))
    unread_alerts = alerts_query.count()
    
    return DashboardStats(
        total_sales_today=float(total_sales_today or 0),
        total_sales_week=float(total_sales_week or 0),
        total_sales_month=float(total_sales_month or 0),
        total_expenses_today=float(total_expenses_today or 0),
        products_low_stock=products_low_stock,
        products_out_of_stock=products_out_of_stock,
        products_expiring_soon=products_expiring_soon,
        unread_alerts=unread_alerts
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
