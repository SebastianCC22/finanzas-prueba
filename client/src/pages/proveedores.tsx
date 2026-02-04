import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/lib/authStore";
import { api, Supplier, SupplierCreate, SupplierInvoice, SupplierInvoiceCreate, SupplierInvoiceSummary, InvoicePaymentCreate, PaymentSchedule, PaymentScheduleCreate, PaymentSchedulePayment, PaymentScheduleSummary, CashRegister } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  Plus, Search, Building2, FileText, AlertTriangle, 
  DollarSign, Calendar, CreditCard, Eye, Trash2, 
  Clock, CheckCircle, XCircle, AlertCircle, Download,
  Paperclip, Upload, File, Image, Loader2
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const PAYMENT_TYPES = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "credito", label: "Crédito" },
  { value: "cheque", label: "Cheque" },
  { value: "otro", label: "Otro" },
];

const INVOICE_STATUS = [
  { value: "pendiente", label: "Pendiente", color: "bg-yellow-500" },
  { value: "parcial", label: "Parcial", color: "bg-blue-500" },
  { value: "pagada", label: "Pagada", color: "bg-green-500" },
  { value: "vencida", label: "Vencida", color: "bg-red-500" },
  { value: "cancelada", label: "Cancelada", color: "bg-gray-500" },
];

export default function Proveedores() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("facturas");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [summary, setSummary] = useState<SupplierInvoiceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  const [supplierForm, setSupplierForm] = useState<SupplierCreate>({
    name: "",
    contact_name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  
  const [invoiceForm, setInvoiceForm] = useState<SupplierInvoiceCreate>({
    supplier_id: 0,
    invoice_number: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    total_amount: 0,
    payment_type: "efectivo",
    notes: "",
  });
  
  const [paymentForm, setPaymentForm] = useState<InvoicePaymentCreate>({
    amount: 0,
    payment_method: "efectivo",
    reference: "",
    notes: "",
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [scheduleSummary, setScheduleSummary] = useState<PaymentScheduleSummary | null>(null);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  });
  const [weekEnd, setWeekEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 6);
    return d.toISOString().split('T')[0];
  });
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedInvoiceForSchedule, setSelectedInvoiceForSchedule] = useState<number | null>(null);
  const [showPaymentScheduleDialog, setShowPaymentScheduleDialog] = useState(false);
  const [selectedScheduleForPayment, setSelectedScheduleForPayment] = useState<PaymentSchedule | null>(null);
  const [schedulePaymentAmount, setSchedulePaymentAmount] = useState(0);
  const [schedulePaymentMethod, setSchedulePaymentMethod] = useState("efectivo");
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedCashRegisterId, setSelectedCashRegisterId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const requests: Promise<any>[] = [
        api.getSuppliers(false),
        api.getSupplierInvoices(),
        api.getInvoiceSummary(),
      ];
      if (user?.store_id) {
        requests.push(api.getCashRegisters(user.store_id));
      }
      const results = await Promise.all(requests);
      setSuppliers(results[0]);
      setInvoices(results[1]);
      setSummary(results[2]);
      if (results[3]) {
        setCashRegisters(results[3]);
        if (results[3].length > 0 && !selectedCashRegisterId) {
          setSelectedCashRegisterId(results[3][0].id);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = INVOICE_STATUS.find(s => s.value === status);
    return (
      <Badge className={cn("text-white", statusInfo?.color || "bg-gray-500")}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const getDaysUntilDue = (dueDate: string) => {
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days < 0) return { text: `Vencida hace ${Math.abs(days)} días`, color: "text-red-500" };
    if (days === 0) return { text: "Vence hoy", color: "text-orange-500" };
    if (days <= 7) return { text: `Vence en ${days} días`, color: "text-yellow-500" };
    return { text: `Vence en ${days} días`, color: "text-muted-foreground" };
  };

  const handleCreateSupplier = async () => {
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, supplierForm);
        toast({ title: "Proveedor actualizado" });
      } else {
        await api.createSupplier(supplierForm);
        toast({ title: "Proveedor creado" });
      }
      setShowSupplierDialog(false);
      setEditingSupplier(null);
      setSupplierForm({ name: "", contact_name: "", phone: "", email: "", address: "", notes: "" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateInvoice = async () => {
    try {
      await api.createSupplierInvoice(invoiceForm);
      toast({ title: "Factura registrada" });
      setShowInvoiceDialog(false);
      setInvoiceForm({
        supplier_id: 0,
        invoice_number: "",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: "",
        total_amount: 0,
        payment_type: "efectivo",
        notes: "",
      });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddPayment = async () => {
    if (!selectedInvoice) return;
    try {
      await api.addInvoicePayment(selectedInvoice.id, paymentForm);
      toast({ title: "Pago registrado" });
      setShowPaymentDialog(false);
      setPaymentForm({ amount: 0, payment_method: "efectivo", reference: "", notes: "" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta factura?")) return;
    try {
      await api.deleteSupplierInvoice(id);
      toast({ title: "Factura eliminada" });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedInvoice || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        title: "Tipo de archivo no permitido", 
        description: "Solo se permiten archivos JPG, PNG, GIF o PDF",
        variant: "destructive" 
      });
      return;
    }
    
    if (file.size > maxSize) {
      toast({ 
        title: "Archivo muy grande", 
        description: "El tamaño máximo es 5MB",
        variant: "destructive" 
      });
      return;
    }
    
    setIsUploading(true);
    try {
      await api.uploadInvoiceFile(selectedInvoice.id, file);
      toast({ title: "Archivo subido exitosamente" });
      loadData();
      const updatedInvoice = invoices.find(i => i.id === selectedInvoice.id);
      if (updatedInvoice) {
        setSelectedInvoice({ ...selectedInvoice, has_file: true, invoice_file_name: file.name });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleViewFile = async () => {
    if (!selectedInvoice) return;
    try {
      const blob = await api.downloadInvoiceFile(selectedInvoice.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteFile = async () => {
    if (!selectedInvoice) return;
    if (!confirm("¿Está seguro de eliminar el archivo adjunto?")) return;
    
    try {
      await api.deleteInvoiceFile(selectedInvoice.id);
      toast({ title: "Archivo eliminado" });
      setSelectedInvoice({ ...selectedInvoice, has_file: false, invoice_file_name: undefined });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadSchedules = async () => {
    try {
      const [schedulesData, summaryData] = await Promise.all([
        api.getPaymentSchedules({ week_start: weekStart, week_end: weekEnd }),
        api.getPaymentScheduleSummary({ week_start: weekStart, week_end: weekEnd })
      ]);
      setSchedules(schedulesData);
      setScheduleSummary(summaryData);
    } catch (error: any) {
      console.error("Error loading schedules:", error);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [weekStart, weekEnd]);

  const handleCreateSchedule = async () => {
    if (!selectedInvoiceForSchedule) return;
    
    try {
      await api.createPaymentSchedule({
        supplier_invoice_id: selectedInvoiceForSchedule,
        payment_type: "total",
        week_start: weekStart,
        week_end: weekEnd
      });
      toast({ title: "Factura programada exitosamente" });
      setShowScheduleDialog(false);
      setSelectedInvoiceForSchedule(null);
      loadSchedules();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSchedulePayment = async () => {
    if (!selectedScheduleForPayment || schedulePaymentAmount <= 0) return;
    
    if (!user?.store_id) {
      toast({ title: "Error", description: "No se ha seleccionado una tienda", variant: "destructive" });
      return;
    }
    
    try {
      await api.registerSchedulePayment(
        selectedScheduleForPayment.id, 
        {
          amount: schedulePaymentAmount,
          payment_method: schedulePaymentMethod,
          notes: ""
        },
        user.store_id,
        selectedCashRegisterId || undefined
      );
      toast({ title: "Abono registrado exitosamente" });
      setShowPaymentScheduleDialog(false);
      setSelectedScheduleForPayment(null);
      setSchedulePaymentAmount(0);
      loadSchedules();
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta programación?")) return;
    try {
      await api.deletePaymentSchedule(id);
      toast({ title: "Programación eliminada" });
      loadSchedules();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getScheduleStatusBadge = (status: string) => {
    switch (status) {
      case "pagada":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Pagada</Badge>;
      case "parcial":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Parcial</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  const unscheduledInvoices = invoices.filter(inv => 
    inv.status !== "pagada" && inv.status !== "cancelada" &&
    !schedules.some(s => s.supplier_invoice_id === inv.id)
  );

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (supplierFilter !== "all" && inv.supplier_id.toString() !== supplierFilter) return false;
    if (searchTerm && !inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !inv.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-title">Pago de Proveedores</h1>
          <p className="text-muted-foreground">Gestión de facturas y pagos a proveedores</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => {
                setEditingSupplier(null);
                setSupplierForm({ name: "", contact_name: "", phone: "", email: "", address: "", notes: "" });
              }} data-testid="button-new-supplier">
                <Building2 className="h-4 w-4 mr-2" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="Nombre del proveedor"
                    data-testid="input-supplier-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contacto</Label>
                    <Input
                      value={supplierForm.contact_name || ""}
                      onChange={(e) => setSupplierForm({ ...supplierForm, contact_name: e.target.value })}
                      placeholder="Nombre de contacto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={supplierForm.phone || ""}
                      onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                      placeholder="Teléfono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={supplierForm.email || ""}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={supplierForm.address || ""}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    placeholder="Dirección"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={supplierForm.notes || ""}
                    onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                    placeholder="Notas adicionales"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSupplierDialog(false)} data-testid="button-cancel-supplier">Cancelar</Button>
                <Button onClick={handleCreateSupplier} disabled={!supplierForm.name} data-testid="button-save-supplier">
                  {editingSupplier ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-invoice">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Factura de Proveedor</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Proveedor *</Label>
                  <Select
                    value={invoiceForm.supplier_id.toString()}
                    onValueChange={(v) => setInvoiceForm({ ...invoiceForm, supplier_id: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.filter(s => s.is_active).map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Factura *</Label>
                    <Input
                      value={invoiceForm.invoice_number}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                      placeholder="FAC-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monto Total *</Label>
                    <Input
                      type="number"
                      value={invoiceForm.total_amount || ""}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, total_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Emisión *</Label>
                    <Input
                      type="date"
                      value={invoiceForm.issue_date}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, issue_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Vencimiento *</Label>
                    <Input
                      type="date"
                      value={invoiceForm.due_date}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Pago</Label>
                  <Select
                    value={invoiceForm.payment_type}
                    onValueChange={(v) => setInvoiceForm({ ...invoiceForm, payment_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={invoiceForm.notes || ""}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                    placeholder="Notas adicionales"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInvoiceDialog(false)} data-testid="button-cancel-invoice">Cancelar</Button>
                <Button 
                  onClick={handleCreateInvoice}
                  disabled={!invoiceForm.supplier_id || !invoiceForm.invoice_number || !invoiceForm.total_amount || !invoiceForm.due_date}
                  data-testid="button-save-invoice"
                >
                  Registrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Pagar</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{formatCurrency(summary?.total_pending || 0)}</div>
            <p className="text-xs text-muted-foreground">{summary?.invoices_pending_count || 0} facturas pendientes</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-red-600">{formatCurrency(summary?.total_overdue || 0)}</div>
            <p className="text-xs text-red-600">{summary?.invoices_overdue_count || 0} facturas vencidas</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Por Vencer</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.invoices_due_soon_count || 0}</div>
            <p className="text-xs text-yellow-600">Próximos 7 días</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Pagado Este Mes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-green-600">{formatCurrency(summary?.total_paid_this_month || 0)}</div>
            <p className="text-xs text-green-600">Pagos realizados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="facturas">Facturas</TabsTrigger>
          <TabsTrigger value="programacion">Programación de Pagos</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="facturas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar factura o proveedor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-invoice"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {INVOICE_STATUS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-supplier-filter">
                      <SelectValue placeholder="Proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredInvoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay facturas registradas</p>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const dueInfo = getDaysUntilDue(invoice.due_date);
                    return (
                      <div
                        key={invoice.id}
                        className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`card-invoice-${invoice.id}`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{invoice.invoice_number}</span>
                            {getStatusBadge(invoice.status)}
                            {invoice.has_file && (
                              <span title="Tiene archivo adjunto">
                                <Paperclip className="h-3 w-3 text-green-500" />
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{invoice.supplier_name}</p>
                          <p className={cn("text-xs", dueInfo.color)}>{dueInfo.text}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 mt-2 md:mt-0">
                          <p className="font-mono font-bold text-lg">{formatCurrency(invoice.total_amount)}</p>
                          {invoice.paid_amount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Pagado: {formatCurrency(invoice.paid_amount)} | Resta: {formatCurrency(invoice.remaining_amount)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4 mt-2 md:mt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {invoice.status !== "pagada" && invoice.status !== "cancelada" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setPaymentForm({ amount: invoice.remaining_amount, payment_method: "efectivo", reference: "", notes: "" });
                                setShowPaymentDialog(true);
                              }}
                              data-testid={`button-pay-invoice-${invoice.id}`}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            data-testid={`button-delete-invoice-${invoice.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programacion" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Programación Semanal de Pagos
                  </CardTitle>
                  <CardDescription>Control de pagos a proveedores por semana</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Semana:</Label>
                  <Input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="w-36"
                    data-testid="input-week-start"
                  />
                  <span className="text-sm">a</span>
                  <Input
                    type="date"
                    value={weekEnd}
                    onChange={(e) => setWeekEnd(e.target.value)}
                    className="w-36"
                    data-testid="input-week-end"
                  />
                  {user?.role === 'admin' && (
                    <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-schedule">
                          <Plus className="h-4 w-4 mr-2" />
                          Programar Factura
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Programar Factura para Pago</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Factura Pendiente</Label>
                            <Select
                              value={selectedInvoiceForSchedule?.toString() || ""}
                              onValueChange={(v) => setSelectedInvoiceForSchedule(parseInt(v))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar factura" />
                              </SelectTrigger>
                              <SelectContent>
                                {unscheduledInvoices.map((inv) => (
                                  <SelectItem key={inv.id} value={inv.id.toString()}>
                                    {inv.invoice_number} - {inv.supplier_name} ({formatCurrency(inv.remaining_amount)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            La factura se programará para la semana: {format(parseISO(weekStart), "dd/MM", { locale: es })} - {format(parseISO(weekEnd), "dd/MM/yyyy", { locale: es })}
                          </p>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancelar</Button>
                          <Button onClick={handleCreateSchedule} disabled={!selectedInvoiceForSchedule}>Programar</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {scheduleSummary && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Programado</p>
                      <p className="text-2xl font-bold font-mono">{formatCurrency(scheduleSummary.total_programado)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-950/20">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Pagado</p>
                      <p className="text-2xl font-bold font-mono text-green-600">{formatCurrency(scheduleSummary.total_pagado)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-950/20">
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Total Pendiente</p>
                      <p className="text-2xl font-bold font-mono text-red-600">{formatCurrency(scheduleSummary.total_pendiente)}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full border-collapse" data-testid="table-payment-schedule">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Proveedor</th>
                      <th className="text-left p-3 font-medium">Venc. Factura</th>
                      <th className="text-left p-3 font-medium">Nº Factura</th>
                      <th className="text-right p-3 font-medium">Monto Factura</th>
                      <th className="text-center p-3 font-medium">Tipo Pago</th>
                      <th className="text-right p-3 font-medium">Monto Pagado</th>
                      <th className="text-right p-3 font-medium">Pendiente</th>
                      <th className="text-center p-3 font-medium">Estado</th>
                      <th className="text-center p-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                          No hay facturas programadas para esta semana
                        </td>
                      </tr>
                    ) : (
                      schedules.map((schedule) => (
                        <tr 
                          key={schedule.id} 
                          className={cn(
                            "border-b hover:bg-muted/30 transition-colors",
                            schedule.status === "pagada" && "bg-green-50 dark:bg-green-950/10",
                            schedule.status === "parcial" && "bg-yellow-50 dark:bg-yellow-950/10",
                            schedule.status === "pendiente" && "bg-red-50 dark:bg-red-950/10"
                          )}
                          data-testid={`row-schedule-${schedule.id}`}
                        >
                          <td className="p-3 font-medium">{schedule.supplier_name}</td>
                          <td className="p-3">{format(parseISO(schedule.invoice_due_date), "dd/MM/yyyy", { locale: es })}</td>
                          <td className="p-3">{schedule.invoice_number}</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(schedule.invoice_amount)}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">{schedule.payment_type.toUpperCase()}</Badge>
                          </td>
                          <td className="p-3 text-right font-mono text-green-600">{formatCurrency(schedule.paid_amount)}</td>
                          <td className="p-3 text-right font-mono text-red-600">{formatCurrency(schedule.pending_amount)}</td>
                          <td className="p-3 text-center">{getScheduleStatusBadge(schedule.status)}</td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center gap-1">
                              {user?.role === 'admin' && schedule.status !== "pagada" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedScheduleForPayment(schedule);
                                    setSchedulePaymentAmount(schedule.pending_amount);
                                    setShowPaymentScheduleDialog(true);
                                  }}
                                  data-testid={`button-pay-schedule-${schedule.id}`}
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                              {user?.role === 'admin' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => handleDeleteSchedule(schedule.id)}
                                  data-testid={`button-delete-schedule-${schedule.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {schedules.length > 0 && (
                    <tfoot className="bg-muted/50 font-medium">
                      <tr>
                        <td colSpan={3} className="p-3">TOTALES</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(scheduleSummary?.total_programado || 0)}</td>
                        <td></td>
                        <td className="p-3 text-right font-mono text-green-600">{formatCurrency(scheduleSummary?.total_pagado || 0)}</td>
                        <td className="p-3 text-right font-mono text-red-600">{formatCurrency(scheduleSummary?.total_pendiente || 0)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {scheduleSummary && scheduleSummary.por_proveedor.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Resumen por Proveedor</h4>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {scheduleSummary.por_proveedor.map((sp, idx) => (
                      <Card key={idx} className="p-3">
                        <p className="font-medium">{sp.proveedor}</p>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-green-600">Pagado: {formatCurrency(sp.pagado)}</span>
                          <span className="text-red-600">Pendiente: {formatCurrency(sp.pendiente)}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proveedores" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {suppliers.map((supplier) => (
                  <Card key={supplier.id} className={cn(!supplier.is_active && "opacity-50")}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        <Badge variant={supplier.is_active ? "default" : "secondary"}>
                          {supplier.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      {supplier.contact_name && (
                        <CardDescription>{supplier.contact_name}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {supplier.phone && <p>📞 {supplier.phone}</p>}
                        {supplier.email && <p>✉️ {supplier.email}</p>}
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground">{supplier.invoices_count} facturas</p>
                          {supplier.pending_amount > 0 && (
                            <p className="font-mono font-medium text-red-500">
                              Pendiente: {formatCurrency(supplier.pending_amount)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setSupplierForm({
                            name: supplier.name,
                            contact_name: supplier.contact_name || "",
                            phone: supplier.phone || "",
                            email: supplier.email || "",
                            address: supplier.address || "",
                            notes: supplier.notes || "",
                          });
                          setShowSupplierDialog(true);
                        }}
                      >
                        Editar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedInvoice.invoice_number}</p>
                <p className="text-sm text-muted-foreground">{selectedInvoice.supplier_name}</p>
                <p className="text-sm">Pendiente: <span className="font-mono font-bold">{formatCurrency(selectedInvoice.remaining_amount)}</span></p>
              </div>
              <div className="space-y-2">
                <Label>Monto a Pagar *</Label>
                <Input
                  type="number"
                  value={paymentForm.amount || ""}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  max={selectedInvoice.remaining_amount}
                />
              </div>
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select
                  value={paymentForm.payment_method || "efectivo"}
                  onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  value={paymentForm.reference || ""}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder="Número de transferencia, cheque, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={paymentForm.notes || ""}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Notas adicionales"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} data-testid="button-cancel-payment">Cancelar</Button>
            <Button onClick={handleAddPayment} disabled={!paymentForm.amount || paymentForm.amount <= 0} data-testid="button-save-payment">
              Registrar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de Factura</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número</p>
                  <p className="font-medium">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{selectedInvoice.supplier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Pago</p>
                  <p className="font-medium capitalize">{selectedInvoice.payment_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha Emisión</p>
                  <p className="font-medium">{format(parseISO(selectedInvoice.issue_date), "dd/MM/yyyy", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha Vencimiento</p>
                  <p className="font-medium">{format(parseISO(selectedInvoice.due_date), "dd/MM/yyyy", { locale: es })}</p>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-mono font-bold">{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Pagado:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-red-600 border-t pt-2 mt-2">
                  <span>Pendiente:</span>
                  <span className="font-mono font-bold">{formatCurrency(selectedInvoice.remaining_amount)}</span>
                </div>
              </div>
              {selectedInvoice.payments.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Historial de Pagos</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedInvoice.payments.map((p) => (
                      <div key={p.id} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                        <div>
                          <p>{format(parseISO(p.payment_date), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.payment_method}</p>
                        </div>
                        <span className="font-mono font-medium text-green-600">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p>{selectedInvoice.notes}</p>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip className="h-4 w-4" />
                  <p className="font-medium">Factura Adjunta</p>
                </div>
                
                {selectedInvoice.has_file ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      {selectedInvoice.invoice_file_name?.endsWith('.pdf') ? (
                        <File className="h-5 w-5 text-red-500" />
                      ) : (
                        <Image className="h-5 w-5 text-blue-500" />
                      )}
                      <span className="text-sm truncate max-w-[200px]">
                        {selectedInvoice.invoice_file_name || "Archivo adjunto"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleViewFile} data-testid="button-view-file">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      {user?.role === 'admin' && (
                        <Button variant="ghost" size="sm" onClick={handleDeleteFile} className="text-red-500 hover:text-red-600" data-testid="button-delete-file">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-2 border-dashed rounded-lg text-center">
                    {user?.role === 'admin' ? (
                      <>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept=".jpg,.jpeg,.png,.gif,.pdf"
                          className="hidden"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          data-testid="button-upload-file"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Subir factura
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">JPG, PNG, GIF o PDF (máx. 5MB)</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin archivo adjunto</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentScheduleDialog} onOpenChange={setShowPaymentScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Abono</DialogTitle>
          </DialogHeader>
          {selectedScheduleForPayment && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Factura</p>
                <p className="font-medium">{selectedScheduleForPayment.invoice_number}</p>
                <p className="text-sm">{selectedScheduleForPayment.supplier_name}</p>
                <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Total:</span>
                    <span className="font-mono">{formatCurrency(selectedScheduleForPayment.invoice_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Pendiente:</span>
                    <span className="font-mono">{formatCurrency(selectedScheduleForPayment.pending_amount)}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Monto a Abonar *</Label>
                <Input
                  type="number"
                  value={schedulePaymentAmount || ""}
                  onChange={(e) => setSchedulePaymentAmount(parseFloat(e.target.value) || 0)}
                  max={selectedScheduleForPayment.pending_amount}
                  data-testid="input-schedule-payment-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={schedulePaymentMethod} onValueChange={setSchedulePaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {cashRegisters.length > 0 && (
                <div className="space-y-2">
                  <Label>Descontar de Caja (opcional)</Label>
                  <Select 
                    value={selectedCashRegisterId?.toString() || ""} 
                    onValueChange={(v) => setSelectedCashRegisterId(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar caja" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin descontar de caja</SelectItem>
                      {cashRegisters.map((cr) => (
                        <SelectItem key={cr.id} value={cr.id.toString()}>
                          {cr.name} ({formatCurrency(cr.current_balance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Si selecciona una caja, el pago se registrará como egreso y se descontará del saldo.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentScheduleDialog(false)}>Cancelar</Button>
            <Button 
              onClick={handleSchedulePayment} 
              disabled={schedulePaymentAmount <= 0}
              data-testid="button-confirm-schedule-payment"
            >
              Registrar Abono
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
