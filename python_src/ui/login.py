from PyQt5.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QLabel, QLineEdit, QPushButton, QMessageBox, QFrame)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont, QColor

from ui.main_window import MainWindow
from database.db import get_db_connection

class LoginWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Finanzas Pro - Acceso")
        self.setFixedSize(400, 500)
        self.setStyleSheet("""
            QMainWindow { background-color: #f0f4f8; }
            QLineEdit { 
                padding: 12px; 
                border-radius: 8px; 
                border: 1px solid #cbd5e0;
                font-size: 16px;
            }
            QPushButton {
                background-color: #3182ce;
                color: white;
                padding: 12px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 14px;
            }
            QPushButton:hover { background-color: #2c5282; }
        """)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setAlignment(Qt.AlignCenter)
        layout.setSpacing(20)
        
        # Logo / Título
        title = QLabel("Finanzas Pro")
        title.setAlignment(Qt.AlignCenter)
        title.setFont(QFont("Segoe UI", 24, QFont.Bold))
        title.setStyleSheet("color: #2d3748;")
        layout.addWidget(title)
        
        subtitle = QLabel("Ingrese su contraseña")
        subtitle.setAlignment(Qt.AlignCenter)
        subtitle.setStyleSheet("color: #718096; font-size: 14px;")
        layout.addWidget(subtitle)
        
        # Input Password
        self.password_input = QLineEdit()
        self.password_input.setPlaceholderText("Contraseña")
        self.password_input.setEchoMode(QLineEdit.Password)
        self.password_input.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.password_input)
        
        # Botón Login
        login_btn = QPushButton("INGRESAR")
        login_btn.setCursor(Qt.PointingHandCursor)
        login_btn.clicked.connect(self.check_login)
        layout.addWidget(login_btn)
        
    def check_login(self):
        password = self.password_input.text()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM usuarios WHERE password = ?", (password,))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            self.main_window = MainWindow()
            self.main_window.show()
            self.close()
        else:
            QMessageBox.warning(self, "Error", "Contraseña incorrecta")
            self.password_input.clear()
