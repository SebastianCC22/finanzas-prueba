from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.models.models import User
from backend.services.config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
from backend.services.security import hash_password, verify_password

SECRET_KEY = JWT_SECRET_KEY
ALGORITHM = JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = JWT_EXPIRE_MINUTES

security = HTTPBearer()

def get_password_hash(password: str) -> str:
    """Wrapper para mantener compatibilidad con código existente."""
    return hash_password(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Solo usuarios con rol ADMIN"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere acceso de administrador"
        )
    return current_user

def require_seller_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Usuarios con rol ADMIN o SELLER pueden realizar ventas y devoluciones"""
    if current_user.role not in ["admin", "seller"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere acceso de vendedor o administrador"
        )
    return current_user

def require_viewer_or_above(current_user: User = Depends(get_current_user)) -> User:
    """Cualquier usuario autenticado (ADMIN, SELLER, VIEWER) - solo lectura para VIEWER"""
    return current_user

def get_effective_store_id(current_user: User, requested_store_id: int = None) -> int:
    """
    Obtiene el store_id efectivo para un usuario.
    - Para sellers: siempre usa su store_id asignado (ignora requested_store_id)
    - Para admins: usa requested_store_id si se proporciona, de lo contrario None
    """
    if current_user.role == "seller":
        if current_user.store_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El vendedor no tiene tienda asignada"
            )
        return current_user.store_id
    return requested_store_id

def validate_store_access(current_user: User, store_id: int) -> bool:
    """
    Valida que el usuario tenga acceso a la tienda especificada.
    - Admins: acceso a todas las tiendas
    - Sellers: solo a su tienda asignada
    """
    if current_user.role == "admin":
        return True
    if current_user.role == "seller" and current_user.store_id == store_id:
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tienes acceso a esta tienda"
    )

def get_open_cash_register(db: Session, user_id: int, store_id: int):
    """
    Verifica si existe una caja abierta (apertura sin cierre) para la tienda del día actual.
    Retorna la apertura si existe, None si no.
    """
    from backend.models.models import CashOpening, CashClosing, AuditLog
    from sqlalchemy import func
    from datetime import datetime
    
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

def require_open_cash_register(db: Session, user_id: int, store_id: int, action: str = "operación"):
    """
    Valida que exista una caja abierta para operar.
    Registra intentos sin caja en auditoría.
    Lanza HTTP 409 si no hay caja abierta.
    """
    from backend.models.models import AuditLog
    
    opening = get_open_cash_register(db, user_id, store_id)
    
    if not opening:
        audit = AuditLog(
            user_id=user_id,
            action="cash_register_required",
            entity_type="cash_opening",
            entity_id=0,
            new_values=f"Intento de {action} sin caja abierta en tienda {store_id}"
        )
        db.add(audit)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No hay caja abierta. Debe realizar la apertura de caja para continuar."
        )
    
    return opening
