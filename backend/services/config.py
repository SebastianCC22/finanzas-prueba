import os
import sys
import logging

logger = logging.getLogger(__name__)

REQUIRED_ENV_VARS = [
    "JWT_SECRET_KEY",
    "DATABASE_URL",
]

OPTIONAL_ENV_VARS = {
    "ADMIN_DEFAULT_PASSWORD": "CHANGE_ME_IN_PRODUCTION",
    "SELLER_DEFAULT_PASSWORD": "CHANGE_ME_IN_PRODUCTION",
    "TUNAL_SELLER_PASSWORD": "CHANGE_ME_IN_PRODUCTION",
    "20J_SELLER_PASSWORD": "CHANGE_ME_IN_PRODUCTION",
    "CASH_CLOSING_THRESHOLD": "50000",
    "JWT_ALGORITHM": "HS256",
    "JWT_EXPIRE_MINUTES": "1440",
}

def validate_environment():
    missing = []
    for var in REQUIRED_ENV_VARS:
        if not os.environ.get(var):
            missing.append(var)
    
    if missing:
        logger.critical(f"Variables de entorno requeridas faltantes: {', '.join(missing)}")
        logger.critical("La aplicación no puede iniciar sin estas variables.")
        sys.exit(1)
    
    jwt_key = os.environ.get("JWT_SECRET_KEY", "")
    if len(jwt_key) < 32:
        logger.warning("JWT_SECRET_KEY debe tener al menos 32 caracteres para seguridad óptima")
    
    if jwt_key == "your-secret-key-change-in-production":
        logger.critical("JWT_SECRET_KEY tiene valor por defecto inseguro. Cambie antes de producción.")
        sys.exit(1)
    
    admin_pwd = os.environ.get("ADMIN_DEFAULT_PASSWORD", "")
    if admin_pwd and admin_pwd in ["CHANGE_ME_IN_PRODUCTION", "admin", "password", "123456"]:
        logger.warning("ADMIN_DEFAULT_PASSWORD tiene un valor inseguro. Cambie en producción.")
    
    blocked_passwords = ["CHANGE_ME_IN_PRODUCTION", ""]
    weak_passwords = ["1234", "password", "123456", "admin"]
    
    tunal_pwd = os.environ.get("TUNAL_SELLER_PASSWORD", "")
    if tunal_pwd in blocked_passwords:
        logger.critical("TUNAL_SELLER_PASSWORD no está configurada o tiene valor por defecto.")
        sys.exit(1)
    if tunal_pwd in weak_passwords:
        logger.warning("TUNAL_SELLER_PASSWORD tiene un valor débil. Considere cambiarlo.")
    
    seller_20j_pwd = os.environ.get("20J_SELLER_PASSWORD", "")
    logger.info(f"DEBUG: 20J_SELLER_PASSWORD length={len(seller_20j_pwd)}, blocked={blocked_passwords}, in_blocked={seller_20j_pwd in blocked_passwords}")
    if seller_20j_pwd in blocked_passwords:
        logger.critical("20J_SELLER_PASSWORD no está configurada o tiene valor por defecto.")
        sys.exit(1)
    if seller_20j_pwd in weak_passwords:
        logger.warning("20J_SELLER_PASSWORD tiene un valor débil. Considere cambiarlo.")
    
    logger.info("Validación de configuración completada")

def get_config(key: str, default: str = None) -> str:
    if key in OPTIONAL_ENV_VARS:
        return os.environ.get(key, OPTIONAL_ENV_VARS[key])
    return os.environ.get(key, default)

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
JWT_ALGORITHM = get_config("JWT_ALGORITHM")
JWT_EXPIRE_MINUTES = int(get_config("JWT_EXPIRE_MINUTES"))
ADMIN_DEFAULT_PASSWORD = get_config("ADMIN_DEFAULT_PASSWORD")
SELLER_DEFAULT_PASSWORD = get_config("SELLER_DEFAULT_PASSWORD")
TUNAL_SELLER_PASSWORD = get_config("TUNAL_SELLER_PASSWORD")
SELLER_20J_PASSWORD = get_config("20J_SELLER_PASSWORD")
CASH_CLOSING_THRESHOLD = get_config("CASH_CLOSING_THRESHOLD")
