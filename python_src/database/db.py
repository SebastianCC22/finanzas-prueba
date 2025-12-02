import sqlite3
import os

DB_NAME = "finanzas.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tabla Usuarios
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            password TEXT NOT NULL
        )
    ''')
    
    # Tabla Cuentas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cuentas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            saldo REAL DEFAULT 0
        )
    ''')
    
    # Tabla Movimientos
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS movimientos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            monto REAL NOT NULL,
            metodo TEXT,
            descripcion TEXT,
            cuenta_id INTEGER,
            fecha TEXT,
            FOREIGN KEY (cuenta_id) REFERENCES cuentas (id)
        )
    ''')
    
    # Usuario por defecto si no existe
    cursor.execute('SELECT * FROM usuarios')
    if cursor.fetchone() is None:
        cursor.execute('INSERT INTO usuarios (password) VALUES (?)', ('1234',))
    
    # Cuentas por defecto de ejemplo
    cursor.execute('SELECT * FROM cuentas')
    if cursor.fetchone() is None:
        cursor.execute("INSERT INTO cuentas (nombre, saldo) VALUES ('Caja Mayor', 0)")
        cursor.execute("INSERT INTO cuentas (nombre, saldo) VALUES ('Nequi', 0)")
        cursor.execute("INSERT INTO cuentas (nombre, saldo) VALUES ('Bancolombia', 0)")
    
    conn.commit()
    conn.close()
