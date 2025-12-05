from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.models.models import Product, Alert, CashRegister

def check_low_stock_products(db: Session):
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.quantity <= Product.min_stock,
        Product.quantity > 0
    ).all()
    
    for product in products:
        existing_alert = db.query(Alert).filter(
            Alert.reference_id == product.id,
            Alert.reference_type == "product",
            Alert.alert_type == "low_stock",
            Alert.is_resolved == False
        ).first()
        
        if not existing_alert:
            alert = Alert(
                store_id=product.store_id,
                alert_type="low_stock",
                title=f"Stock bajo: {product.name}",
                message=f"El producto {product.name} tiene solo {product.quantity} unidades (mínimo: {product.min_stock})",
                reference_id=product.id,
                reference_type="product"
            )
            db.add(alert)
    
    db.commit()

def check_out_of_stock_products(db: Session):
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.quantity == 0
    ).all()
    
    for product in products:
        existing_alert = db.query(Alert).filter(
            Alert.reference_id == product.id,
            Alert.reference_type == "product",
            Alert.alert_type == "out_of_stock",
            Alert.is_resolved == False
        ).first()
        
        if not existing_alert:
            alert = Alert(
                store_id=product.store_id,
                alert_type="out_of_stock",
                title=f"Producto agotado: {product.name}",
                message=f"El producto {product.name} está agotado",
                reference_id=product.id,
                reference_type="product"
            )
            db.add(alert)
    
    db.commit()

def check_expiring_products(db: Session, days_threshold: int = 30):
    threshold_date = datetime.now() + timedelta(days=days_threshold)
    
    products = db.query(Product).filter(
        Product.is_active == True,
        Product.expiration_date != None,
        Product.expiration_date <= threshold_date,
        Product.quantity > 0
    ).all()
    
    for product in products:
        existing_alert = db.query(Alert).filter(
            Alert.reference_id == product.id,
            Alert.reference_type == "product",
            Alert.alert_type == "expiring_soon",
            Alert.is_resolved == False
        ).first()
        
        if not existing_alert:
            days_left = (product.expiration_date - datetime.now()).days
            alert = Alert(
                store_id=product.store_id,
                alert_type="expiring_soon",
                title=f"Producto próximo a vencer: {product.name}",
                message=f"El producto {product.name} vence en {days_left} días ({product.expiration_date.strftime('%Y-%m-%d')})",
                reference_id=product.id,
                reference_type="product"
            )
            db.add(alert)
    
    db.commit()

def check_negative_balances(db: Session):
    registers = db.query(CashRegister).filter(
        CashRegister.current_balance < 0
    ).all()
    
    for register in registers:
        existing_alert = db.query(Alert).filter(
            Alert.reference_id == register.id,
            Alert.reference_type == "cash_register",
            Alert.alert_type == "negative_balance",
            Alert.is_resolved == False
        ).first()
        
        if not existing_alert:
            alert = Alert(
                store_id=register.store_id,
                alert_type="negative_balance",
                title=f"Balance negativo: {register.name}",
                message=f"La caja {register.name} tiene un balance negativo de ${register.current_balance:,.2f}",
                reference_id=register.id,
                reference_type="cash_register"
            )
            db.add(alert)
    
    db.commit()

def run_all_alerts(db: Session):
    check_low_stock_products(db)
    check_out_of_stock_products(db)
    check_expiring_products(db)
    check_negative_balances(db)
