# Guía de Inicio — Finanzas Rincon Integral

## Arquitectura del Sistema

```
Puerto 5000 ──▶ Express (Node.js)  ──▶ proxy /api/* ──▶ Puerto 8000 (FastAPI / Python)
                      │                                          │
                  React (Vite)                             SQLite / PostgreSQL
                  (Frontend)                               (Base de datos)
```

- **Frontend**: React + Vite, servido por Express en puerto 5000
- **Backend**: FastAPI (Python), corriendo en puerto 8000
- **Base de datos**: SQLite por defecto (archivo local), o PostgreSQL si se configura
- **Proxy**: Express redirige todas las peticiones `/api/*` al backend Python automáticamente

---

## Requisitos Previos

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Python | 3.11+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 8+ | `npm --version` |

---

## 1. Configuración del Entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto. **La aplicación no inicia sin él.**

```bash
# En la raíz del proyecto:
cp .env.example .env  # si existe, o créalo manualmente
```

### Contenido del `.env`

```env
# ─── REQUERIDAS (la app NO inicia sin estas) ───────────────────────────────

# Clave secreta para JWT — mínimo 32 caracteres, cambia este valor
JWT_SECRET_KEY=cambia_esta_clave_por_una_muy_larga_y_segura_aqui_32chars

# URL de base de datos
# OPCIÓN A — SQLite (más simple, sin instalar nada):
DATABASE_URL=sqlite:///./finanzas.db

# OPCIÓN B — PostgreSQL (recomendado para producción):
# DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/finanzas_rincon

# ─── CONTRASEÑAS DE USUARIOS (REQUERIDAS — no pueden quedar en blanco) ──────

# Contraseña del cajero de la tienda Tunal
TUNAL_SELLER_PASSWORD=contraseña_cajero_tunal

# Contraseña del cajero de la tienda 20 de Julio
SELLER_20J_PASSWORD=contraseña_cajero_20j

# ─── CONTRASEÑAS OPCIONALES ──────────────────────────────────────────────────

# Contraseña del administrador (por defecto: CHANGE_ME_IN_PRODUCTION)
ADMIN_DEFAULT_PASSWORD=contraseña_administrador

# Contraseña genérica de vendedor
SELLER_DEFAULT_PASSWORD=contraseña_vendedor

# ─── OPCIONALES (tienen valores por defecto) ─────────────────────────────────
# CASH_CLOSING_THRESHOLD=50000
# JWT_ALGORITHM=HS256
# JWT_EXPIRE_MINUTES=1440
```

> **Importante:** El archivo `.env` no debe subirse a git (ya está en `.gitignore`).

---

## 2. Base de Datos

### Opción A — SQLite (Sin configuración adicional)

Con `DATABASE_URL=sqlite:///./finanzas.db` en el `.env`, la base de datos se crea **automáticamente** al iniciar el backend. No requiere instalar ni configurar nada.

El archivo `finanzas.db` aparecerá en la raíz del proyecto.

### Opción B — PostgreSQL

**1. Crear la base de datos:**

```bash
# Entrar a PostgreSQL como superusuario
sudo -u postgres psql

# Dentro de psql:
CREATE USER finanzas_user WITH PASSWORD 'tu_contraseña';
CREATE DATABASE finanzas_rincon OWNER finanzas_user;
GRANT ALL PRIVILEGES ON DATABASE finanzas_rincon TO finanzas_user;
\q
```

**2. Actualizar el `.env`:**

```env
DATABASE_URL=postgresql://finanzas_user:tu_contraseña@localhost:5432/finanzas_rincon
```

**3. Las tablas se crean automáticamente** al iniciar el backend por primera vez. No necesitas correr migraciones manualmente.

---

## 3. Instalación de Dependencias

### Python (Backend)

El proyecto ya tiene un entorno virtual en `backend/venv/`. Actívalo e instala las dependencias:

```bash
# Crear entorno virtual si no existe
python3 -m venv backend/venv

# Activar el entorno virtual
source backend/venv/bin/activate   # Linux / macOS
# backend\venv\Scripts\activate    # Windows

# Instalar dependencias
pip install fastapi uvicorn sqlalchemy psycopg2-binary bcrypt \
    python-jose python-multipart apscheduler pytz pydantic \
    openpyxl reportlab passlib alembic
```

O usando `uv` (si está instalado):

```bash
uv sync
```

### Node.js (Frontend + Servidor proxy)

```bash
npm install
```

---

## 4. Iniciar en Desarrollo

Necesitas **dos terminales** (o un solo comando que las gestione).

### Método 1 — Un solo comando (recomendado)

> Asegúrate de haber activado el venv de Python primero.

```bash
# Terminal 1 — activar venv
source backend/venv/bin/activate

# Luego iniciar todo:
npm run dev
```

Esto hace dos cosas automáticamente:
- Lanza el backend Python con `uvicorn` en el puerto **8000**
- Lanza el servidor Express con Vite en el puerto **5000**

Accede a la aplicación en: **http://localhost:5000**

### Método 2 — Dos terminales separadas

**Terminal 1 — Backend Python:**

```bash
source backend/venv/bin/activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend + Proxy:**

```bash
npm run dev
```

---

## 5. Iniciar en Producción

### Paso 1 — Construir la aplicación

```bash
# Asegúrate de tener el venv activado
source backend/venv/bin/activate

npm run build
```

Esto genera la carpeta `dist/` con:
- `dist/public/` — Frontend compilado (React)
- `dist/index.cjs` — Servidor Express compilado

### Paso 2 — Iniciar en producción

```bash
# Con el venv activado:
source backend/venv/bin/activate

NODE_ENV=production node dist/index.cjs
```

Accede en: **http://localhost:5000**

> En producción, el backend Python (puerto 8000) sirve el frontend desde `dist/public/`.

---

## 6. Usuarios por Defecto

Al iniciar por primera vez, la app crea automáticamente estos usuarios y tiendas:

| Usuario | Rol | Contraseña (variable .env) | Tienda |
|---|---|---|---|
| Administrador | admin | `ADMIN_DEFAULT_PASSWORD` | — |
| Cajero Tunal | seller | `TUNAL_SELLER_PASSWORD` | Tunal |
| Cajero 20J | seller | `SELLER_20J_PASSWORD` | 20 de Julio |

Y estas tiendas:
- **Tunal** (código: TUN)
- **20 de Julio** (código: 20J)

---

## 7. Estructura del Proyecto

```
├── backend/               # API Python (FastAPI)
│   ├── main.py            # Punto de entrada del backend
│   ├── api/routes.py      # Endpoints de la API
│   ├── models/            # Modelos SQLAlchemy + configuración DB
│   ├── services/          # Lógica de negocio (auth, backup, etc.)
│   └── venv/              # Entorno virtual Python
│
├── client/                # Frontend React (Vite)
│   └── src/               # Código fuente React
│
├── server/                # Servidor Express (proxy + dev server)
│   ├── index.ts           # Punto de entrada Node.js
│   └── routes.ts          # Proxy hacia el backend Python
│
├── shared/                # Tipos/esquemas compartidos
├── script/                # Scripts de build y arranque
├── dist/                  # Build de producción (generado)
├── finanzas.db            # Base de datos SQLite (generada al iniciar)
├── package.json           # Dependencias Node.js
├── pyproject.toml         # Dependencias Python
└── .env                   # Variables de entorno (CREAR MANUALMENTE)
```

---

## 8. Verificar que Todo Funciona

```bash
# Health check del backend Python
curl http://localhost:8000/api/health

# Respuesta esperada:
# {"status": "healthy", "timestamp": "2026-..."}
```

La aplicación en el navegador en: **http://localhost:5000**

---

## 9. Solución de Problemas Comunes

### "Variables de entorno requeridas faltantes: JWT_SECRET_KEY, DATABASE_URL"
→ El archivo `.env` no existe o no tiene esas variables. Revisa el paso 1.

### "TUNAL_SELLER_PASSWORD no está configurada o tiene valor por defecto"
→ Esas contraseñas son obligatorias. Asígnales un valor en el `.env`.

### El backend Python no arranca al correr `npm run dev`
→ El venv de Python debe estar activado antes de correr el comando:
```bash
source backend/venv/bin/activate && npm run dev
```

### Error de módulo Python no encontrado
→ Las dependencias Python no están instaladas. Activa el venv y corre:
```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary bcrypt python-jose python-multipart apscheduler pytz pydantic openpyxl reportlab passlib
```

### Puerto 5000 o 8000 en uso
```bash
# Ver qué proceso usa el puerto
lsof -i :5000
lsof -i :8000

# Terminar el proceso (reemplaza PID por el número)
kill -9 PID
```
