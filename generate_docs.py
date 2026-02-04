from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os

def generate_documentation_pdf():
    filename = "documentacion_finanzas_rincon_integral.pdf"
    doc = SimpleDocTemplate(filename, pagesize=letter, 
                           rightMargin=72, leftMargin=72, 
                           topMargin=72, bottomMargin=72)
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1e293b')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceBefore=20,
        spaceAfter=10,
        textColor=colors.HexColor('#334155')
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=13,
        spaceBefore=15,
        spaceAfter=8,
        textColor=colors.HexColor('#475569')
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=8,
        leading=16
    )
    
    elements = []
    
    elements.append(Paragraph("Finanzas Rincón Integral", title_style))
    elements.append(Paragraph("Manual de Usuario y Documentación Técnica", ParagraphStyle(
        'Subtitle', parent=styles['Normal'], fontSize=14, alignment=TA_CENTER, 
        textColor=colors.HexColor('#64748b'), spaceAfter=40
    )))
    
    elements.append(Paragraph("1. Descripción General", heading_style))
    elements.append(Paragraph(
        "Sistema de gestión financiera diseñado para las tiendas naturistas El Rincón Integral "
        "(sucursales Tunal y 20 de Julio). Permite controlar ventas, inventario, gastos, "
        "transferencias de dinero y operaciones diarias de caja.",
        body_style
    ))
    
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("2. Usuarios del Sistema", heading_style))
    
    user_data = [
        ['Usuario', 'Acceso', 'Permisos'],
        ['Administrador', 'Todas las tiendas', 'Acceso completo a todas las funciones'],
        ['Cajero Tunal', 'Solo Tunal', 'Ventas, gastos, devoluciones, cierres'],
        ['Cajero 20 de Julio', 'Solo 20 de Julio', 'Ventas, gastos, devoluciones, cierres'],
    ]
    
    user_table = Table(user_data, colWidths=[1.5*inch, 1.5*inch, 3*inch])
    user_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    elements.append(user_table)
    
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("3. Módulos del Sistema", heading_style))
    
    modules = [
        ("3.1 Apertura de Caja", [
            "Registra el efectivo inicial del día",
            "Es obligatoria antes de realizar cualquier operación",
            "Se debe hacer una apertura por tienda por día"
        ]),
        ("3.2 Ventas (POS)", [
            "Punto de venta con búsqueda rápida de productos",
            "Soporte para pagos múltiples: Efectivo, Nequi, Bold, Daviplata",
            "Aplicar descuentos por producto o globales",
            "Numeración automática de ventas por tienda",
            "Historial de ventas del día con detalles"
        ]),
        ("3.3 Devoluciones", [
            "Devoluciones totales o parciales sobre ventas existentes",
            "Opción de reintegrar productos al inventario",
            "Registro del motivo de devolución",
            "Vinculación automática con la venta original"
        ]),
        ("3.4 Egresos (Gastos)", [
            "Registro de gastos con descripción detallada",
            "Selección del método de pago utilizado",
            "Descuento automático del saldo de la caja correspondiente",
            "Historial completo de gastos"
        ]),
        ("3.5 Transferencias entre Cajas", [
            "Mover dinero entre las cajas de la misma tienda",
            "Registro de caja origen y caja destino",
            "Validación de saldo suficiente antes de transferir"
        ]),
        ("3.6 Traspasos de Productos", [
            "Transferir inventario entre tiendas (solo administrador)",
            "Crea automáticamente el producto en la tienda destino si no existe",
            "Registro de cantidad y motivo del traspaso"
        ]),
        ("3.7 Cierre de Caja", [
            "Resumen completo del día: ventas, gastos, devoluciones",
            "Comparación entre efectivo esperado y efectivo contado",
            "Identificación de diferencias (sobrantes/faltantes)",
            "Generación de reporte de cierre"
        ]),
        ("3.8 Inventario (Solo Administrador)", [
            "Gestión completa de productos (crear, editar, eliminar)",
            "Campos: nombre, marca, proveedor, precio compra/venta, IVA, stock",
            "Filtros por categoría, proveedor y marca",
            "Exportación a Excel para respaldo",
            "Alertas de stock bajo"
        ]),
        ("3.9 Proveedores (Solo Administrador)", [
            "Gestión de proveedores y datos de contacto",
            "Registro de facturas pendientes",
            "Control de pagos realizados"
        ]),
        ("3.10 Reportes", [
            "Dashboard con estadísticas generales",
            "Ventas por método de pago",
            "Top productos más vendidos",
            "Gráficos de rendimiento"
        ]),
    ]
    
    for title, items in modules:
        elements.append(Paragraph(title, subheading_style))
        for item in items:
            elements.append(Paragraph(f"• {item}", body_style))
    
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("4. Seguridad del Sistema", heading_style))
    
    security_items = [
        "Autenticación mediante tokens JWT",
        "Contraseñas encriptadas con algoritmo bcrypt",
        "Cajeros restringidos únicamente a su tienda asignada",
        "Registro de auditoría para acciones críticas",
        "Validación obligatoria de caja abierta para operaciones financieras",
        "Variables de entorno para credenciales sensibles"
    ]
    
    for item in security_items:
        elements.append(Paragraph(f"• {item}", body_style))
    
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("5. Flujo de Trabajo Diario", heading_style))
    
    workflow = [
        ("1. Inicio del día", "El cajero ingresa al sistema y realiza la APERTURA DE CAJA indicando el efectivo inicial."),
        ("2. Operaciones", "Durante el día puede realizar ventas, registrar gastos, procesar devoluciones y transferir dinero entre cajas."),
        ("3. Fin del día", "El cajero cuenta el efectivo físico y realiza el CIERRE DE CAJA. El sistema muestra las diferencias si las hay."),
    ]
    
    for step, desc in workflow:
        elements.append(Paragraph(f"<b>{step}</b>", body_style))
        elements.append(Paragraph(desc, body_style))
    
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("6. Información Técnica", heading_style))
    
    tech_data = [
        ['Componente', 'Tecnología'],
        ['Frontend', 'React 18 + TypeScript + Vite'],
        ['Backend', 'FastAPI (Python) + Express.js (proxy)'],
        ['Base de Datos', 'PostgreSQL'],
        ['Estilos', 'Tailwind CSS + Shadcn/ui'],
        ['Autenticación', 'JWT (JSON Web Tokens)'],
        ['Exportaciones', 'Excel (openpyxl) + PDF (ReportLab)'],
    ]
    
    tech_table = Table(tech_data, colWidths=[2*inch, 4*inch])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    elements.append(tech_table)
    
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("© 2024 El Rincón Integral - Tienda Naturista", ParagraphStyle(
        'Footer', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER,
        textColor=colors.HexColor('#94a3b8')
    )))
    
    doc.build(elements)
    print(f"PDF generado: {filename}")
    return filename

if __name__ == "__main__":
    generate_documentation_pdf()
