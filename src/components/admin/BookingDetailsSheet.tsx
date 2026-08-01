import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Loader2, Printer, CheckCircle, XCircle, Clock, PartyPopper, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { format } from "date-fns";
import BookingInvoice from "./BookingInvoice";

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  event_date: string;
  package_type: string;
  guests: number;
  total_price: number;
  status: string;
  created_at: string;
  message?: string;
  menu_items?: any;
  venues?: { name: string };
  event_time?: string;
  event_type?: string;
  billing_type?: string;
}

interface AddonRow {
  id: string;
  price: number;
  addon_id: string;
  addon_services?: { name: string; category: string } | null;
}

interface BookingDetailsSheetProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const BookingDetailsSheet = ({ booking, open, onOpenChange, onUpdate }: BookingDetailsSheetProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  const [newPayment, setNewPayment] = useState({
    amount: "",
    payment_type: "credit",
    payment_method: "cash",
    notes: ""
  });

  useEffect(() => {
    if (booking && open) {
      fetchPayments();
      fetchAddons();
    }
  }, [booking, open]);

  const fetchPayments = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  const fetchAddons = async () => {
    if (!booking) return;
    try {
      const { data } = await supabase
        .from("booking_addons")
        .select("id, price, addon_id, addon_services(name, category)")
        .eq("booking_id", booking.id);
      setAddons((data as any) || []);
    } catch {}
  };

  const addPayment = async () => {
    if (!booking || !newPayment.amount) return;
    setAdding(true);
    try {
      const { error } = await supabase.from("booking_payments").insert({
        booking_id: booking.id,
        amount: parseFloat(newPayment.amount),
        payment_type: newPayment.payment_type,
        payment_method: newPayment.payment_method,
        notes: newPayment.notes || null
      });

      if (error) throw error;
      toast.success("Payment added");
      setNewPayment({ amount: "", payment_type: "credit", payment_method: "cash", notes: "" });
      fetchPayments();
    } catch (error) {
      toast.error("Failed to add payment");
    } finally {
      setAdding(false);
    }
  };

  const deletePayment = async (id: string) => {
    try {
      const { error } = await supabase.from("booking_payments").delete().eq("id", id);
      if (error) throw error;
      toast.success("Payment deleted");
      fetchPayments();
    } catch (error) {
      toast.error("Failed to delete payment");
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!booking) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", booking.id);

      if (error) throw error;

      // Send status update email
      try {
        await supabase.functions.invoke("send-status-update", {
          body: {
            customerName: booking.name,
            customerEmail: booking.email,
            eventDate: format(new Date(booking.event_date), "MMMM dd, yyyy"),
            venueName: booking.venues?.name || "N/A",
            newStatus: newStatus,
            totalPrice: booking.total_price || 0,
          },
        });
      } catch (emailError) {
        console.error("Failed to send status email:", emailError);
      }

      toast.success(`Status updated to ${newStatus}`);
      onUpdate();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrint = () => {
    setInvoiceOpen(true);
    setTimeout(() => {
      if (invoiceRef.current) {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Invoice - ${booking?.name}</title>
                <style>
                  body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                  @media print { body { padding: 0; } }
                </style>
              </head>
              <body>
                ${invoiceRef.current.outerHTML}
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
      setInvoiceOpen(false);
    }, 100);
  };

  const handleDownloadPDF = () => {
    setInvoiceOpen(true);
    setTimeout(async () => {
      if (invoiceRef.current) {
        try {
          const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Invoice-${booking?.name}-${booking?.id.slice(0, 8)}.pdf`);
          toast.success("PDF downloaded successfully");
        } catch (error) {
          toast.error("Failed to generate PDF");
        }
      }
      setInvoiceOpen(false);
    }, 300);
  };

  const totalCredits = payments.filter(p => p.payment_type === "credit").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalDebits = payments.filter(p => p.payment_type === "debit").reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = totalCredits - totalDebits;
  const remaining = (booking?.total_price || 0) - balance;

  if (!booking) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Booking Details - {booking.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Update Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={booking.status === "pending" ? "default" : "outline"}
              onClick={() => updateStatus("pending")}
              disabled={updatingStatus || booking.status === "pending"}
            >
              <Clock className="h-4 w-4 mr-1" /> Pending
            </Button>
            <Button
              size="sm"
              variant={booking.status === "confirmed" ? "default" : "outline"}
              className={booking.status === "confirmed" ? "bg-green-600 hover:bg-green-700" : ""}
              onClick={() => updateStatus("confirmed")}
              disabled={updatingStatus || booking.status === "confirmed"}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Confirmed
            </Button>
            <Button
              size="sm"
              variant={booking.status === "completed" ? "default" : "outline"}
              className={booking.status === "completed" ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => updateStatus("completed")}
              disabled={updatingStatus || booking.status === "completed"}
            >
              <PartyPopper className="h-4 w-4 mr-1" /> Completed
            </Button>
            <Button
              size="sm"
              variant={booking.status === "cancelled" ? "destructive" : "outline"}
              onClick={() => updateStatus("cancelled")}
              disabled={updatingStatus || booking.status === "cancelled"}
            >
              <XCircle className="h-4 w-4 mr-1" /> Cancelled
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="ml-auto">
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>

          {/* Booking Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{booking.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{booking.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Event Date</p>
              <p className="font-medium">{format(new Date(booking.event_date), "MMM dd, yyyy")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Venue</p>
              <p className="font-medium">{booking.venues?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Package</p>
              <p className="font-medium">{booking.package_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Event Time</p>
              <p className="font-medium capitalize">{booking.event_time || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Event Type</p>
              <p className="font-medium capitalize">{booking.event_type || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billing Type</p>
              <p className="font-medium capitalize">
                {booking.billing_type === "per_head" ? "Per Head Event"
                  : booking.billing_type === "service" ? "Service"
                  : booking.billing_type === "service_cooking" ? "Service & Cooking"
                  : booking.billing_type || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Guests</p>
              <p className="font-medium">{booking.guests}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Price</p>
              <p className="text-xl font-bold text-primary">Rs. {booking.total_price?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted On</p>
              <p className="font-medium">{format(new Date(booking.created_at), "MMM dd, yyyy 'at' h:mm a")}</p>
            </div>
            {booking.message && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Customer Message / Notes</p>
                <p className="font-medium whitespace-pre-wrap">{booking.message}</p>
              </div>
            )}
          </div>

          {/* Selected Menu Items */}
          {Array.isArray(booking.menu_items) && booking.menu_items.length > 0 && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Selected Menu Items ({booking.menu_items.length})</h3>
              <div className="space-y-2">
                {(() => {
                  const grouped: Record<string, any[]> = {};
                  booking.menu_items.forEach((m: any) => {
                    const cat = m.category || "Other";
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(m);
                  });
                  return Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-sm font-semibold text-primary">{cat}</p>
                      <ul className="text-sm pl-4 list-disc">
                        {items.map((m: any, i: number) => (
                          <li key={i}>
                            {m.name}
                            {m.price ? ` — Rs. ${Number(m.price).toLocaleString()}${booking.billing_type === "per_head" ? "/person" : ""}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Add-on Services */}
          {addons.length > 0 && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-3">Add-on Services ({addons.length})</h3>
              <ul className="text-sm space-y-1">
                {addons.map((a) => (
                  <li key={a.id} className="flex justify-between">
                    <span>
                      {a.addon_services?.name || "Add-on"}
                      {a.addon_services?.category ? <span className="text-muted-foreground"> · {a.addon_services.category}</span> : null}
                    </span>
                    <span className="font-medium">Rs. {Number(a.price).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Payment Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Credits (Received)</p>
              <p className="text-lg font-bold text-green-600">Rs. {totalCredits.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Debits (Refunds)</p>
              <p className="text-lg font-bold text-red-600">Rs. {totalDebits.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Balance Paid</p>
              <p className="text-lg font-bold text-blue-600">Rs. {balance.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-lg font-bold text-orange-600">Rs. {remaining.toLocaleString()}</p>
            </div>
          </div>

          {/* Add Payment Form */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="font-semibold">Add Payment Entry</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (Rs.)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newPayment.payment_type} onValueChange={(v) => setNewPayment({ ...newPayment, payment_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (Received)</SelectItem>
                    <SelectItem value="debit">Debit (Refund/Expense)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Method</Label>
                <Select value={newPayment.payment_method} onValueChange={(v) => setNewPayment({ ...newPayment, payment_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  placeholder="e.g., Advance payment"
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={addPayment} disabled={adding || !newPayment.amount} className="w-full">
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Entry
            </Button>
          </div>

          {/* Payment History Table */}
          <div>
            <h3 className="font-semibold mb-3">Payment History</h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No payment entries yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={payment.payment_type === "credit" ? "default" : "destructive"}>
                          {payment.payment_type === "credit" ? "Credit" : "Debit"}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{payment.payment_method}</TableCell>
                      <TableCell className={payment.payment_type === "credit" ? "text-green-600" : "text-red-600"}>
                        {payment.payment_type === "credit" ? "+" : "-"}Rs. {Number(payment.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{payment.notes || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => deletePayment(payment.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Hidden Invoice for Printing */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <BookingInvoice ref={invoiceRef} booking={booking} payments={payments} />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Close</Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default BookingDetailsSheet;
