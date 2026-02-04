import os
import zipfile
import io
import logging
import traceback
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

from backend.models.database import engine, Base, SessionLocal
from backend.models.models import User, Store, CashRegister
from backend.api.routes import router
from backend.services.security import hash_password
from backend.services.backup_service import create_backup, cleanup_old_backups
from backend.services.logging_service import setup_logging, log_error, log_critical
from backend.services.config import validate_environment, ADMIN_DEFAULT_PASSWORD, SELLER_DEFAULT_PASSWORD, TUNAL_SELLER_PASSWORD, SELLER_20J_PASSWORD

setup_logging()
logger = logging.getLogger(__name__)

validate_environment()

scheduler = BackgroundScheduler()

def run_automatic_backup():
    db = SessionLocal()
    try:
        logger.info("Iniciando backup automático diario...")
        backup = create_backup(db, user_id=None, backup_type="automatic")
        logger.info(f"Backup automático completado: {backup.filename}")
        
        deleted = cleanup_old_backups(db, keep_count=30)
        if deleted > 0:
            logger.info(f"Limpieza: {deleted} backups antiguos eliminados")
    except Exception as e:
        log_error(logger, "Error en backup automático", e)
        raise
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "Administrador").first()
        admin_password = ADMIN_DEFAULT_PASSWORD
        if not admin:
            admin = User(
                username="Administrador",
                email="admin@example.com",
                password_hash=hash_password(admin_password),
                full_name="Administrador",
                role="admin"
            )
            db.add(admin)
            db.commit()
            logger.info("Usuario admin por defecto creado: Administrador")
        else:
            admin.password_hash = hash_password(admin_password)
            db.commit()
            logger.info("Contraseña de Administrador actualizada")
        
        stores = db.query(Store).all()
        if not stores:
            store_tunal = Store(name="Tunal", code="TUN", address="Centro Comercial Tunal", sale_sequence=0)
            store_20 = Store(name="20 de Julio", code="20J", address="Barrio 20 de Julio", sale_sequence=0)
            db.add(store_tunal)
            db.add(store_20)
            db.commit()
            db.refresh(store_tunal)
            db.refresh(store_20)
            logger.info("Tiendas creadas: Tunal, 20 de Julio")
        else:
            store_tunal = db.query(Store).filter(Store.code == "TUN").first()
            store_20 = db.query(Store).filter(Store.code == "20J").first()
        
        cajero_tunal = db.query(User).filter(User.username == "Cajero Tunal").first()
        if not cajero_tunal and store_tunal:
            cajero_tunal = User(
                username="Cajero Tunal",
                email="cajero.tunal@example.com",
                password_hash=hash_password(TUNAL_SELLER_PASSWORD),
                full_name="Cajero Tunal",
                role="seller",
                store_id=store_tunal.id
            )
            db.add(cajero_tunal)
            db.commit()
            logger.info("Usuario Cajero Tunal creado")
        elif cajero_tunal:
            cajero_tunal.password_hash = hash_password(TUNAL_SELLER_PASSWORD)
            db.commit()
            logger.info("Contraseña de Cajero Tunal actualizada")
        
        cajero_20j = db.query(User).filter(User.username == "Cajero 20J").first()
        if not cajero_20j and store_20:
            cajero_20j = User(
                username="Cajero 20J",
                email="cajero.20j@example.com",
                password_hash=hash_password(SELLER_20J_PASSWORD),
                full_name="Cajero 20 de Julio",
                role="seller",
                store_id=store_20.id
            )
            db.add(cajero_20j)
            db.commit()
            logger.info("Usuario Cajero 20J creado")
        elif cajero_20j:
            cajero_20j.password_hash = hash_password(SELLER_20J_PASSWORD)
            db.commit()
            logger.info("Contraseña de Cajero 20J actualizada")
        
        cash_registers = db.query(CashRegister).first()
        if not cash_registers and store_tunal and store_20:
            for store in [store_tunal, store_20]:
                for method in ["efectivo", "nequi", "bold", "daviplata"]:
                    menor = CashRegister(
                        store_id=store.id,
                        name=f"Caja Menor {method.capitalize()}",
                        payment_method=method,
                        register_type="menor",
                        is_global=False
                    )
                    db.add(menor)
                    
                    if method == "efectivo":
                        mayor = CashRegister(
                            store_id=store.id,
                            name=f"Caja Mayor Efectivo",
                            payment_method=method,
                            register_type="mayor",
                            is_global=False
                        )
                        db.add(mayor)
            
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
            logger.info("Cajas registradoras creadas")
    finally:
        db.close()
    
    bogota_tz = pytz.timezone("America/Bogota")
    scheduler.add_job(
        run_automatic_backup,
        CronTrigger(hour=2, minute=0, timezone=bogota_tz),
        id="daily_backup",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler de backups automáticos iniciado (2:00 AM hora Colombia)")
    
    yield
    
    scheduler.shutdown()

app = FastAPI(
    title="Finanzas Rincon Integral API",
    description="Sistema de gestión de ventas, inventario y cajas para tiendas naturistas",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

dist_path = "dist/public"
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=f"{dist_path}/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_path, "index.html"))

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    stack = traceback.format_exc()
    error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
    
    log_critical(
        logger,
        f"Error ID: {error_id} | {request.method} {request.url.path} | {type(exc).__name__}: {str(exc)}",
        exc
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "error_id": error_id,
            "type": type(exc).__name__
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
