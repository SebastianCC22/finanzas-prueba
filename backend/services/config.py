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
CASH_CLOSING_THRESHOLD = get_config("CASH_CLOSING_THRESHOLD")
