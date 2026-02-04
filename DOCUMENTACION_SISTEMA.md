# Finanzas Rincón Integral - Documentación del Sistema

## 1. Descripción General

**Finanzas Rincón Integral** es un sistema de gestión financiera diseñado para administrar dos tiendas de productos naturales en Colombia:
- **Tunal**
- **20 de Julio**

El sistema permite controlar ventas, gastos, inventario, caja registradora, transferencias entre cuentas y pagos a proveedores.

---

## 2. Usuarios y Roles

### 2.1 Cajero
- **Usuario:** Cajero
- **Contraseña:** 1234
- **Permisos:**
  - Registrar ventas (ingresos)
  - Registrar gastos (egresos)
  - Realizar apertura de caja
  - Realizar cierre de caja
  - Ver dashboard básico
  - Gestionar devoluciones
  - Realizar transferencias entre cuentas

### 2.2 Administrador
- **Usuario:** Administrador
- **Contraseña:** Rarerimolero71
- **Permisos:**
  - Todos los permisos del Cajero
  - Acceso al inventario completo
  - Gestión de productos (crear, editar, eliminar)
  - Traspasos de productos entre tiendas
  - Reportes avanzados
  - **Pago de Proveedores** (exclusivo admin)

---

## 3. Flujo de Trabajo

### 3.1 Inicio de Sesión
1. El usuario ingresa sus credenciales (Usuario + Contraseña)
2. El sistema valida las credenciales
3. Si es válido, muestra la pantalla de **Selección de Tienda**
4. El usuario selecciona la tienda donde trabajará (Tunal o 20 de Julio)
5. Se redirige al Dashboard principal

### 3.2 Operación Diaria
1. **Apertura de Caja:** El cajero registra el dinero inicial en cada cuenta
2. **Operaciones del día:** Ventas, gastos, transferencias
3. **Cierre de Caja:** Al final del día, se registra el cierre con los saldos finales

---

## 4. Módulos del Sistema

### 4.1 Dashboard
- **Ruta:** `/`
- **Descripción:** Pantalla principal con resumen del día
- **Muestra:**
  - Total de ventas del día
  - Total de gastos del día
  - Balance del día
  - Gráfico de distribución de métodos de pago
  - Últimas transacciones

### 4.2 Ventas (Ingresos)
- **Ruta:** `/ventas`
- **Descripción:** Registro de ventas/ingresos
- **Campos:**
  - Monto
  - Método de pago (Efectivo, Nequi, Daviplata, Bold)
  - Cuenta destino
  - Descripción
  - Producto relacionado (opcional)
- **Funcionalidades:**
  - Búsqueda de productos con autocompletado
  - Auto-llenado de precio al seleccionar producto

### 4.3 Gastos (Egresos)
- **Ruta:** `/egresos`
- **Descripción:** Registro de gastos
- **Campos:**
  - Monto
  - Categoría
  - Método de pago
  - Cuenta origen
  - Descripción
- **Categorías disponibles:**
  - Compra de mercancía
  - Servicios públicos
  - Arriendo
  - Nómina
  - Transporte
  - Publicidad
  - Mantenimiento
  - Otros

### 4.4 Devoluciones
- **Ruta:** `/devoluciones`
- **Descripción:** Gestión de devoluciones de productos
- **Campos:**
  - Producto
  - Cantidad
  - Motivo
  - Tipo de reembolso (efectivo, crédito, cambio)

### 4.5 Transferencias
- **Ruta:** `/transferencias`
- **Descripción:** Movimiento de dinero entre cuentas
- **Cuentas disponibles (por tienda):**
  - Caja Mayor
  - Caja Menor
  - Nequi Mayor
  - Nequi Menor
  - Daviplata Mayor
  - Daviplata Menor
  - Bold Mayor
  - Bold Menor
- **Validación:** Verifica que haya saldo suficiente en la cuenta origen

### 4.6 Inventario
- **Ruta:** `/inventario`
- **Acceso:** Requiere contraseña de admin (1234)
- **Descripción:** Gestión completa de productos
- **Campos de producto:**
  - Nombre
  - Precio de venta
  - Precio de costo
  - Cantidad en stock
  - Presentación (unidad, jarabe, líquido, polvo, tabletas, cápsulas, crema, otro)
  - Proveedor
  - Marca
  - Peso (opcional)
  - Si tiene IVA
- **Funcionalidades:**
  - Crear, editar, eliminar productos
  - Filtrar por presentación, proveedor, marca
  - Buscar por nombre
  - Productos con IVA resaltados en azul
  - Stock bajo alertas

### 4.7 Traspasos de Productos
- **Ruta:** `/traspasos-productos`
- **Acceso:** Solo Administrador
- **Descripción:** Transferir productos entre tiendas
- **Campos:**
  - Tienda origen
  - Tienda destino
  - Producto
  - Cantidad
- **Validación:** Verifica stock disponible en tienda origen

### 4.8 Apertura de Caja
- **Ruta:** `/apertura`
- **Descripción:** Registrar saldos iniciales del día
- **Proceso:**
  1. Se muestra cada cuenta con su saldo del sistema
  2. El cajero ingresa el saldo real contado físicamente
  3. Se detectan diferencias automáticamente
  4. Se guarda el registro de apertura

### 4.9 Cierre de Caja
- **Ruta:** `/cierre`
- **Descripción:** Registrar saldos finales del día
- **Proceso:**
  1. Se muestra resumen de operaciones del día
  2. El cajero cuenta el dinero físico
  3. Se compara con el saldo esperado del sistema
  4. Se detectan y reportan diferencias
  5. Se genera reporte de cierre

### 4.10 Reportes
- **Ruta:** `/reportes`
- **Descripción:** Informes y análisis financieros
- **Tipos de reportes:**
  - Ventas por período
  - Gastos por categoría
  - Movimientos por cuenta
  - Comparativo entre tiendas
  - Productos más vendidos
  - Historial de aperturas/cierres

### 4.11 Pago de Proveedores (Nuevo)
- **Ruta:** `/proveedores`
- **Acceso:** Solo Administrador
- **Descripción:** Gestión de facturas y pagos a proveedores

#### 4.11.1 Gestión de Proveedores
- **Campos:**
  - Nombre del proveedor
  - Nombre de contacto
  - Teléfono
  - Email
  - Dirección
  - Notas
  - Estado (Activo/Inactivo)

#### 4.11.2 Gestión de Facturas
- **Campos:**
  - Proveedor
  - Número de factura
  - Fecha de emisión
  - Fecha de vencimiento
  - Monto total
  - Tipo de pago (Efectivo, Transferencia, Crédito, Cheque, Otro)
  - Notas
- **Estados de factura:**
  - **Pendiente:** Factura sin ningún pago
  - **Parcial:** Factura con pagos parciales (abonos)
  - **Pagada:** Factura completamente pagada
  - **Vencida:** Factura pasada de su fecha de vencimiento (automático)
  - **Cancelada:** Factura anulada

#### 4.11.3 Pagos/Abonos
- Permite registrar pagos parciales a una factura
- **Campos del pago:**
  - Monto a pagar
  - Método de pago
  - Referencia (número de transferencia, cheque, etc.)
  - Notas
- El sistema actualiza automáticamente:
  - Monto pagado acumulado
  - Monto restante
  - Estado de la factura (parcial → pagada si se completa)

#### 4.11.4 Panel de Resumen
- **Por Pagar:** Total de facturas pendientes
- **Vencidas:** Monto y cantidad de facturas vencidas (alerta roja)
- **Por Vencer:** Facturas que vencen en los próximos 7 días (alerta amarilla)
- **Pagado Este Mes:** Total pagado en el mes actual

#### 4.11.5 Historial de Pagos
- Cada factura mantiene un historial completo de pagos
- Se puede ver: fecha, monto, método de pago

---

## 5. Estructura de Cuentas

Cada tienda tiene 8 cuentas para manejar el dinero:

| Cuenta | Tipo | Descripción |
|--------|------|-------------|
| Caja Mayor | Efectivo | Caja principal para transacciones grandes |
| Caja Menor | Efectivo | Caja para transacciones pequeñas/cambio |
| Nequi Mayor | Digital | Cuenta Nequi principal |
| Nequi Menor | Digital | Cuenta Nequi secundaria |
| Daviplata Mayor | Digital | Cuenta Daviplata principal |
| Daviplata Menor | Digital | Cuenta Daviplata secundaria |
| Bold Mayor | Datáfono | Terminal Bold principal |
| Bold Menor | Datáfono | Terminal Bold secundario |

---

## 6. Arquitectura Técnica

### 6.1 Frontend (Cliente)
- **Framework:** React 18 con TypeScript
- **Bundler:** Vite
- **Estilos:** Tailwind CSS
- **Componentes UI:** Shadcn/ui (basado en Radix UI)
- **Enrutamiento:** Wouter
- **Estado:** Zustand
- **Formularios:** React Hook Form + Zod
- **Gráficos:** Recharts

### 6.2 Backend (Servidor)
- **Framework:** FastAPI (Python)
- **Base de datos:** PostgreSQL
- **ORM:** SQLAlchemy
- **Autenticación:** JWT (JSON Web Tokens)
- **Proxy:** Express.js (Node.js) para servir el frontend

### 6.3 Base de Datos

#### Tablas principales:
- `users` - Usuarios del sistema
- `stores` - Tiendas (Tunal, 20 de Julio)
- `accounts` - Cuentas de dinero por tienda
- `transactions` - Transacciones (ventas, gastos)
- `products` - Inventario de productos
- `product_stocks` - Stock por producto y tienda
- `cash_registers` - Cajas registradoras
- `register_openings` - Aperturas de caja
- `register_closings` - Cierres de caja
- `transfers` - Transferencias entre cuentas
- `returns` - Devoluciones
- `product_transfers` - Traspasos de productos entre tiendas
- `suppliers` - Proveedores
- `supplier_invoices` - Facturas de proveedores
- `invoice_payments` - Pagos/abonos a facturas

---

## 7. Seguridad

### 7.1 Autenticación
- Login con usuario y contraseña
- Tokens JWT con expiración
- Sesiones persistentes en el navegador

### 7.2 Autorización
- Rutas protegidas por rol
- Endpoints del backend verifican permisos
- Módulos exclusivos para admin no accesibles por cajeros

### 7.3 Datos Sensibles
- Contraseñas hasheadas con bcrypt
- Tokens almacenados de forma segura
- Variables de entorno para configuración sensible

---

## 8. Zona Horaria

El sistema está configurado para la zona horaria de Colombia:
- **Zona:** America/Bogota (UTC-5)
- Todas las fechas y horas se muestran en hora local colombiana

---

## 9. Funcionalidades Pendientes/Futuras

Las siguientes funcionalidades fueron mencionadas pero no están completamente implementadas:

1. **Exportar a Excel** - Reportes en formato Excel
2. **Notificaciones push** - Alertas automáticas de facturas por vencer
3. **Subida de imágenes de facturas** - Adjuntar fotos de facturas físicas
4. **Filtros por rango de fechas en facturas** - Filtrar facturas por período
5. **Respaldo automático** - Copias de seguridad de la base de datos

---

## 10. Contacto y Soporte

Para soporte técnico o preguntas sobre el sistema, contactar al administrador del sistema.

---

*Última actualización: Febrero 2026*
