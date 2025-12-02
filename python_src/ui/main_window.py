from PyQt5.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QTabWidget, QLabel, QTableWidget, QTableWidgetItem, 
                             QHeaderView, QPushButton, QComboBox, QDateEdit, 
                             QFormLayout, QDoubleSpinBox, QLineEdit, QMessageBox, QGroupBox)
from PyQt5.QtCore import QDate, Qt
from database.db import get_db_connection
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Finanzas Pro - Panel Principal")
        self.resize(1000, 700)
        self.setStyleSheet("""
            QMainWindow { background-color: #f7fafc; }
            QTabWidget::pane { border: 1px solid #e2e8f0; background: white; border-radius: 8px; }
            QTabBar::tab {
                background: #edf2f7;
                padding: 10px 20px;
                margin-right: 4px;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                color: #4a5568;
            }
            QTabBar::tab:selected { background: white; color: #2b6cb0; font-weight: bold; }
            QPushButton {
                background-color: #3182ce; color: white; padding: 8px 16px; border-radius: 6px;
            }
            QTableWidget { border: none; gridline-color: #edf2f7; }
            QHeaderView::section { background-color: #f7fafc; padding: 8px; border: none; font-weight: bold; }
        """)
        
        self.tabs = QTabWidget()
        self.setCentralWidget(self.tabs)
        
        self.create_balance_tab()
        self.create_movimientos_tab("Ingreso")
        self.create_movimientos_tab("Egreso")
        self.create_cuentas_tab()
        
    def create_balance_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        
        # Resumen Cards
        cards_layout = QHBoxLayout()
        self.lbl_ingresos = self.create_card("Total Ingresos", "green")
        self.lbl_egresos = self.create_card("Total Egresos", "red")
        self.lbl_balance = self.create_card("Balance General", "blue")
        
        cards_layout.addWidget(self.lbl_ingresos)
        cards_layout.addWidget(self.lbl_egresos)
        cards_layout.addWidget(self.lbl_balance)
        layout.addLayout(cards_layout)
        
        # Chart Placeholder
        self.figure, self.ax = plt.subplots()
        self.canvas = FigureCanvas(self.figure)
        layout.addWidget(self.canvas)
        
        refresh_btn = QPushButton("Actualizar Balance")
        refresh_btn.clicked.connect(self.refresh_balance)
        layout.addWidget(refresh_btn)
        
        self.tabs.addTab(tab, "Balance")
        
    def create_card(self, title, color):
        frame = QGroupBox()
        layout = QVBoxLayout(frame)
        lbl_title = QLabel(title)
        lbl_title.setStyleSheet("color: gray; font-size: 12px;")
        lbl_value = QLabel("$0.00")
        lbl_value.setStyleSheet(f"color: {color}; font-size: 24px; font-weight: bold;")
        layout.addWidget(lbl_title)
        layout.addWidget(lbl_value)
        return frame

    def create_movimientos_tab(self, tipo):
        tab = QWidget()
        layout = QHBoxLayout(tab)
        
        # Formulario (Izquierda)
        form_group = QGroupBox(f"Nuevo {tipo}")
        form_layout = QFormLayout(form_group)
        
        amount_input = QDoubleSpinBox()
        amount_input.setMaximum(999999999)
        
        method_input = QComboBox()
        method_input.addItems(["Efectivo", "Nequi", "Bancolombia", "Otro"])
        
        desc_input = QLineEdit()
        
        account_input = QComboBox()
        self.load_accounts_into_combo(account_input)
        
        date_input = QDateEdit()
        date_input.setDate(QDate.currentDate())
        date_input.setCalendarPopup(True)
        
        form_layout.addRow("Monto:", amount_input)
        form_layout.addRow("Método:", method_input)
        form_layout.addRow("Descripción:", desc_input)
        form_layout.addRow("Cuenta:", account_input)
        form_layout.addRow("Fecha:", date_input)
        
        save_btn = QPushButton("Guardar")
        save_btn.clicked.connect(lambda: self.save_movement(tipo, amount_input, method_input, desc_input, account_input, date_input))
        form_layout.addRow(save_btn)
        
        layout.addWidget(form_group, 1)
        
        # Tabla (Derecha)
        table = QTableWidget()
        table.setColumnCount(5)
        table.setHorizontalHeaderLabels(["Fecha", "Descripción", "Método", "Cuenta", "Monto"])
        table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        
        # Guardar referencia para refrescar
        if tipo == "Ingreso":
            self.table_ingresos = table
        else:
            self.table_egresos = table
            
        layout.addWidget(table, 2)
        
        self.tabs.addTab(tab, f"{tipo}s")

    def create_cuentas_tab(self):
        tab = QWidget()
        layout = QVBoxLayout(tab)
        
        # Simple lista de cuentas
        self.table_cuentas = QTableWidget()
        self.table_cuentas.setColumnCount(2)
        self.table_cuentas.setHorizontalHeaderLabels(["Nombre de Cuenta", "Saldo Actual"])
        self.table_cuentas.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        layout.addWidget(self.table_cuentas)
        
        # Form para nueva cuenta
        form_layout = QHBoxLayout()
        self.new_account_name = QLineEdit()
        self.new_account_name.setPlaceholderText("Nombre nueva cuenta")
        add_btn = QPushButton("Crear Cuenta")
        add_btn.clicked.connect(self.add_account)
        
        form_layout.addWidget(self.new_account_name)
        form_layout.addWidget(add_btn)
        layout.addLayout(form_layout)
        
        self.tabs.addTab(tab, "Cuentas")

    # Lógica
    def load_accounts_into_combo(self, combo):
        combo.clear()
        conn = get_db_connection()
        cuentas = conn.execute("SELECT id, nombre FROM cuentas").fetchall()
        conn.close()
        for c in cuentas:
            combo.addItem(c['nombre'], c['id'])

    def save_movement(self, tipo, amount_w, method_w, desc_w, account_w, date_w):
        monto = amount_w.value()
        metodo = method_w.currentText()
        desc = desc_w.text()
        cuenta_id = account_w.currentData()
        fecha = date_w.date().toString("yyyy-MM-dd")
        
        if monto <= 0 or not desc:
            QMessageBox.warning(self, "Error", "Monto y descripción requeridos")
            return
            
        conn = get_db_connection()
        conn.execute("INSERT INTO movimientos (tipo, monto, metodo, descripcion, cuenta_id, fecha) VALUES (?, ?, ?, ?, ?, ?)",
                     (tipo, monto, metodo, desc, cuenta_id, fecha))
        
        # Actualizar Saldo
        factor = 1 if tipo == "Ingreso" else -1
        conn.execute("UPDATE cuentas SET saldo = saldo + ? WHERE id = ?", (monto * factor, cuenta_id))
        
        conn.commit()
        conn.close()
        
        QMessageBox.information(self, "Éxito", "Movimiento guardado")
        amount_w.setValue(0)
        desc_w.clear()
        self.refresh_all()

    def add_account(self):
        nombre = self.new_account_name.text()
        if not nombre: return
        
        conn = get_db_connection()
        conn.execute("INSERT INTO cuentas (nombre, saldo) VALUES (?, 0)", (nombre,))
        conn.commit()
        conn.close()
        
        self.new_account_name.clear()
        self.refresh_all()

    def refresh_all(self):
        self.load_table_data(self.table_ingresos, "Ingreso")
        self.load_table_data(self.table_egresos, "Egreso")
        self.load_cuentas_table()
        self.refresh_balance()

    def load_table_data(self, table, tipo):
        conn = get_db_connection()
        rows = conn.execute("""
            SELECT m.fecha, m.descripcion, m.metodo, c.nombre, m.monto 
            FROM movimientos m 
            JOIN cuentas c ON m.cuenta_id = c.id 
            WHERE m.tipo = ? ORDER BY m.fecha DESC
        """, (tipo,)).fetchall()
        conn.close()
        
        table.setRowCount(len(rows))
        for i, row in enumerate(rows):
            table.setItem(i, 0, QTableWidgetItem(row['fecha']))
            table.setItem(i, 1, QTableWidgetItem(row['descripcion']))
            table.setItem(i, 2, QTableWidgetItem(row['metodo']))
            table.setItem(i, 3, QTableWidgetItem(row['nombre']))
            table.setItem(i, 4, QTableWidgetItem(f"${row['monto']:,.0f}"))

    def load_cuentas_table(self):
        conn = get_db_connection()
        rows = conn.execute("SELECT nombre, saldo FROM cuentas").fetchall()
        conn.close()
        
        self.table_cuentas.setRowCount(len(rows))
        for i, row in enumerate(rows):
            self.table_cuentas.setItem(i, 0, QTableWidgetItem(row['nombre']))
            self.table_cuentas.setItem(i, 1, QTableWidgetItem(f"${row['saldo']:,.0f}"))

    def refresh_balance(self):
        conn = get_db_connection()
        ingresos = conn.execute("SELECT SUM(monto) FROM movimientos WHERE tipo='Ingreso'").fetchone()[0] or 0
        egresos = conn.execute("SELECT SUM(monto) FROM movimientos WHERE tipo='Egreso'").fetchone()[0] or 0
        
        # Saldos por cuenta para gráfica
        cuentas = conn.execute("SELECT nombre, saldo FROM cuentas").fetchall()
        conn.close()
        
        balance = ingresos - egresos # O usar suma de saldos
        
        # Update Labels (buscando labels hijos del groupbox es feo, mejor guardar referencia directa si fuera serio)
        # Simplificación:
        self.lbl_ingresos.findChild(QLabel, "", Qt.FindChildrenRecursively).next().setText(f"${ingresos:,.0f}") if hasattr(self, 'lbl_ingresos') else None
        
        # Re-plot
        self.ax.clear()
        names = [c['nombre'] for c in cuentas]
        values = [c['saldo'] for c in cuentas]
        self.ax.bar(names, values, color=['#4299e1', '#48bb78', '#f56565'])
        self.ax.set_title("Saldos por Cuenta")
        self.canvas.draw()
        
    def showEvent(self, event):
        self.refresh_all()
