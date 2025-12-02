import sys
import os
from PyQt5.QtWidgets import QApplication
from database.db import initialize_db
from ui.login import LoginWindow

# Asegurar que el directorio raíz esté en el path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def main():
    # Inicializar Base de Datos
    initialize_db()
    
    # Iniciar Aplicación
    app = QApplication(sys.argv)
    app.setStyle("Fusion")  # Estilo moderno y limpio
    
    # Mostrar Login
    login = LoginWindow()
    login.show()
    
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
