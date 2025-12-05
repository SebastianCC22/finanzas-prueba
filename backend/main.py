import os
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager

from backend.models.database import engine, Base, SessionLocal
from backend.models.models import User, Store, CashRegister
from backend.api.routes import router
from backend.services.auth import get_password_hash

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                full_name="Administrador",
                role="admin"
            )
            db.add(admin)
            db.commit()
            print("Default admin user created: admin / admin123")
        
        stores = db.query(Store).all()
        if not stores:
            store_tunal = Store(name="Tunal", address="Centro Comercial Tunal")
            store_20 = Store(name="20 de Julio", address="Barrio 20 de Julio")
            db.add(store_tunal)
            db.add(store_20)
            db.commit()
            db.refresh(store_tunal)
            db.refresh(store_20)
            
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
            print("Default stores and cash registers created")
    finally:
        db.close()
    
    yield

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
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
