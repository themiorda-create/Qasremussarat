import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Printer, Download, FileSpreadsheet, FolderOpen, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

interface ReportRow {
  b_id: number;
  date: string;
  name: string;
  event: string;
  edate: string;
  billing: string;
  guests: number;
  booked: number;
  received: number;
  balance: number;
  total_exp: number;
  income: number;
  raw_id: string;
}

type FilterMode = "booking_date" | "event_date";
type BillingFilter = "all" | "per_head" | "service" | "service_cooking";

const BILLING_LABEL: Record<string, string> = {
  per_head: "Per Head Event",
  service: "Service",
  service_cooking: "Service & Cooking",
};

// IndexedDB helpers to persist directory handle across reloads
const DB_NAME = "qem-backup";
const STORE = "handles";
async function idbGet(key: string): Promise<any> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, "readonly");
      const get = tx.objectStore(STORE).get(key);
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  });
}
async function idbSet(key: string, value: any) {
  return new Promise<void>((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
    };
  });
}

const PaymentReport = () => {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [filterMode, setFilterMode] = useState<FilterMode>("event_date");
  const [billingFilter, setBillingFilter] = useState<BillingFilter>("all");
  const [startDate, setStartDate] = useState(format(firstOfMonth, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [backupDir, setBackupDir] = useState<any>(null);
  const [backupDirName, setBackupDirName] = useState<string>("");
  const [autoBackup, setAutoBackup] = useState(true);
  const [backingUpAll, setBackingUpAll] = useState(false);
  const [lastSavedPath, setLastSavedPath] = useState<string>("");
  const reportRef = useRef<HTMLDivElement>(null);

  const fsaSupported = typeof (window as any).showDirectoryPicker === "function";

  useEffect(() => {
    (async () => {
      const handle = await idbGet("backup_dir");
      if (handle) {
        try {
          const perm = await handle.queryPermission({ mode: "readwrite" });
          if (perm === "granted") {
            setBackupDir(handle);
            setBackupDirName(handle.name);
          }
        } catch {}
      }
    })();
  }, []);

  const pickBackupFolder = async () => {
    if (!fsaSupported) {
      toast.error("Folder picker not supported. Use Chrome/Edge/Brave on desktop (not in an iframe). A ZIP download fallback is available below.");
      return;
    }
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      const perm = await handle.requestPermission({ mode: "readwrite" });
      if (perm !== "granted") {
        toast.error("Write permission denied for this folder.");
        return;
      }
      await idbSet("backup_dir", handle);
      setBackupDir(handle);
      setBackupDirName(handle.name);
      toast.success(`Backup folder set: ${handle.name}`);
    } catch (e: any) {
      if (e?.name === "AbortError") return; // user cancelled
      console.error(e);
      toast.error(`Couldn't open folder picker: ${e?.message || e?.name || "unknown error"}. If you're inside the Lovable preview iframe, open the published site in a new tab.`);
    }
  };

  // Fallback: download a ZIP backup when folder picker isn't available
  const downloadZipBackup = async (files: { name: string; content: string | Blob }[], zipName: string) => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const f of files) zip.file(f.name, f.content as any);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = zipName; a.click();
    URL.revokeObjectURL(url);
  };

  const ensurePerm = async (handle: any) => {
    const perm = await handle.queryPermission({ mode: "readwrite" });
    if (perm === "granted") return true;
    const req = await handle.requestPermission({ mode: "readwrite" });
    return req === "granted";
  };

  const writeToBackupFolder = async (filename: string, content: string | Blob) => {
    if (!backupDir) return false;
    try {
      const ok = await ensurePerm(backupDir);
      if (!ok) return false;
      // Organize: <yyyy-MM MonthName>/<yyyy-MM-dd>/file
      const now = new Date();
      const monthFolder = format(now, "yyyy-MM MMMM");
      const dateFolder = format(now, "yyyy-MM-dd");
      const monthDir = await backupDir.getDirectoryHandle(monthFolder, { create: true });
      const sub = await monthDir.getDirectoryHandle(dateFolder, { create: true });
      const file = await sub.getFileHandle(filename, { create: true });
      const writable = await file.createWritable();
      await writable.write(content);
      await writable.close();
      const fullPath = `${backupDir.name}/${monthFolder}/${dateFolder}/${filename}`;
      setLastSavedPath(fullPath);
      return true;
    } catch (e) {
      console.error("Backup write failed", e);
      return false;
    }
  };

  const generateReport = async () => {
    if (!startDate || !endDate) return toast.error("Select both dates");
    if (new Date(startDate) > new Date(endDate)) return toast.error("Start must be before end");
    setLoading(true);
    try {
      const dateCol = filterMode === "event_date" ? "event_date" : "created_at";
      const startVal = filterMode === "event_date" ? startDate : `${startDate}T00:00:00`;
      const endVal = filterMode === "event_date" ? endDate : `${endDate}T23:59:59`;

      let query = supabase
        .from("bookings")
        .select("id, name, event_date, event_time, total_price, created_at, billing_type, guests")
        .gte(dateCol, startVal)
        .lte(dateCol, endVal)
        .order(dateCol, { ascending: true });

      if (billingFilter !== "all") {
        query = query.eq("billing_type", billingFilter);
      }

      const { data: bookings, error: bErr } = await query;

      if (bErr) throw bErr;
      if (!bookings || bookings.length === 0) {
        setRows([]);
        setHasSearched(true);
        toast.info("No bookings found in this date range");
        return;
      }

      const ids = bookings.map((b) => b.id);
      const { data: payments, error: pErr } = await supabase
        .from("booking_payments")
        .select("booking_id, amount, payment_type")
        .in("booking_id", ids);
      if (pErr) throw pErr;

      const reportRows: ReportRow[] = bookings.map((b: any, idx) => {
        const bp = (payments || []).filter((p) => p.booking_id === b.id);
        const received = bp.filter((p) => p.payment_type === "credit").reduce((s, p) => s + Number(p.amount), 0);
        const total_exp = bp.filter((p) => p.payment_type === "debit").reduce((s, p) => s + Number(p.amount), 0);
        const booked = Number(b.total_price || 0);
        return {
          b_id: idx + 1, raw_id: b.id, date: b.created_at, name: b.name,
          event: b.event_time || "day", edate: b.event_date,
          billing: b.billing_type || "per_head",
          guests: Number(b.guests || 0),
          booked, received, balance: booked - received, total_exp, income: received - total_exp,
        };
      });

      setRows(reportRows);
      setHasSearched(true);
      toast.success(`Loaded ${reportRows.length} bookings`);

      if (autoBackup && backupDir) {
        const stamp = format(new Date(), "HHmmss");
        const fname = `report-${filterMode}-${startDate}_to_${endDate}-${stamp}`;
        await writeToBackupFolder(`${fname}.json`, JSON.stringify({ filterMode, startDate, endDate, rows: reportRows }, null, 2));
        await writeToBackupFolder(`${fname}.csv`, buildCsv(reportRows));
        toast.success("Auto-backup saved to local folder");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const totals = rows.reduce(
    (acc, r) => ({
      guests: acc.guests + r.guests,
      booked: acc.booked + r.booked, received: acc.received + r.received,
      balance: acc.balance + r.balance, total_exp: acc.total_exp + r.total_exp, income: acc.income + r.income,
    }),
    { guests: 0, booked: 0, received: 0, balance: 0, total_exp: 0, income: 0 }
  );

  const buildCsv = (data: ReportRow[]) => {
    const headers = ["B_ID", "Booking Date", "Name", "Event", "Event Date", "Billing Type", "Guests", "Booked", "Received", "Balance", "Total Exp", "Income"];
    const lines = [headers.join(",")];
    data.forEach((r) => {
      lines.push([
        r.b_id, format(new Date(r.date), "d MMMM yyyy"), `"${r.name.replace(/"/g, '""')}"`,
        r.event, format(new Date(r.edate), "d MMMM yyyy"), BILLING_LABEL[r.billing] || r.billing,
        r.guests,
        r.booked.toFixed(2), r.received.toFixed(2), r.balance.toFixed(2), r.total_exp.toFixed(2), r.income.toFixed(2),
      ].join(","));
    });
    const t = data.reduce((a, r) => ({
      booked: a.booked + r.booked, received: a.received + r.received, balance: a.balance + r.balance,
      total_exp: a.total_exp + r.total_exp, income: a.income + r.income, guests: a.guests + r.guests,
    }), { booked: 0, received: 0, balance: 0, total_exp: 0, income: 0, guests: 0 });
    lines.push(["", "", "", "", "", "Grand Total", t.guests, t.booked.toFixed(2), t.received.toFixed(2), t.balance.toFixed(2), t.total_exp.toFixed(2), t.income.toFixed(2)].join(","));
    return lines.join("\n");
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Booking Payment Summary Report</title>
      <style>body{margin:0;padding:20px;font-family:Arial,sans-serif;color:#000}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #333;padding:6px 8px;text-align:center}
      th{background:#f3f3f3;font-weight:bold}
      @media print{body{padding:0}}</style></head><body>${reportRef.current.innerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  const buildReportPdf = (data: ReportRow[]) => {
    const pdf = new jsPDF("l", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Qasr-e-Mussarat Marquee", pageW / 2, 14, { align: "center" });
    pdf.setFontSize(12);
    pdf.text("Booking Payment Summary Report", pageW / 2, 21, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const filterTxt = `Filter: ${filterMode === "event_date" ? "Event Date" : "Booking Date"}  |  Billing: ${billingFilter === "all" ? "All" : BILLING_LABEL[billingFilter]}  |  Range: ${startDate} to ${endDate}  |  Generated: ${format(new Date(), "d MMM yyyy HH:mm")}`;
    pdf.text(filterTxt, pageW / 2, 27, { align: "center" });

    const head = [["#", "Booking Date", "Name", "Event", "Event Date", "Billing", "Guests", "Booked", "Received", "Balance", "Total Exp", "Income"]];
    const body = data.map((r) => [
      r.b_id,
      format(new Date(r.date), "d MMM yyyy"),
      r.name,
      r.event,
      format(new Date(r.edate), "d MMM yyyy"),
      BILLING_LABEL[r.billing] || r.billing,
      r.guests,
      fmt(r.booked), fmt(r.received), fmt(r.balance), fmt(r.total_exp), fmt(r.income),
    ]);
    const t = data.reduce((a, r) => ({
      guests: a.guests + r.guests,
      booked: a.booked + r.booked, received: a.received + r.received, balance: a.balance + r.balance,
      total_exp: a.total_exp + r.total_exp, income: a.income + r.income,
    }), { guests: 0, booked: 0, received: 0, balance: 0, total_exp: 0, income: 0 });

    autoTable(pdf, {
      startY: 32,
      head, body,
      foot: [["", "", "", "", "", "Grand Total", t.guests, fmt(t.booked), fmt(t.received), fmt(t.balance), fmt(t.total_exp), fmt(t.income)]],
      styles: { fontSize: 8, cellPadding: 2, lineColor: [80, 80, 80], lineWidth: 0.1 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, halign: "center" },
      footStyles: { fillColor: [243, 244, 246], textColor: 0, fontStyle: "bold" },
      bodyStyles: { halign: "center" },
      columnStyles: { 2: { halign: "left" }, 7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" }, 10: { halign: "right" }, 11: { halign: "right" } },
      didDrawPage: (d) => {
        const str = `Page ${pdf.getNumberOfPages()}`;
        pdf.setFontSize(8);
        pdf.text(str, pageW - 14, pdf.internal.pageSize.getHeight() - 6, { align: "right" });
      },
    });
    return pdf;
  };

  const handleDownloadPDF = async () => {
    if (rows.length === 0) return toast.error("No data to export");
    try {
      const pdf = buildReportPdf(rows);
      const fname = `Payment-Report-${startDate}-to-${endDate}.pdf`;
      pdf.save(fname);
      if (autoBackup && backupDir) {
        const blob = pdf.output("blob");
        await writeToBackupFolder(fname, blob);
      }
      toast.success("PDF downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };

  const handleDownloadCSV = async () => {
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fname = `Payment-Report-${startDate}-to-${endDate}.csv`;
    a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
    if (autoBackup && backupDir) await writeToBackupFolder(fname, csv);
    toast.success("CSV downloaded");
  };

  // Backup ALL data — full snapshot of every table the admin can read.
  // Saves to chosen folder if available; otherwise downloads a ZIP.
  const backupAllData = async () => {
    setBackingUpAll(true);
    try {
      const tables = [
        "bookings", "booking_payments", "booking_addons", "booking_staff", "booking_checklist",
        "venues", "menu_items", "addon_services", "staff", "seasonal_pricing",
        "meetings", "meeting_history", "reviews", "gallery_images", "contact_info",
        "digital_products", "digital_product_purchases", "event_reminders", "chat_messages",
      ];
      const snapshot: Record<string, any> = { _meta: { exported_at: new Date().toISOString() } };
      let okCount = 0;
      for (const t of tables) {
        const { data, error } = await supabase.from(t as any).select("*");
        if (!error) {
          snapshot[t] = data || [];
          okCount++;
        } else {
          snapshot[t] = { error: error.message };
        }
      }
      const stamp = format(new Date(), "yyyyMMdd-HHmmss");
      const json = JSON.stringify(snapshot, null, 2);
      const fname = `FULL-BACKUP-${stamp}.json`;

      // Build a nicely formatted PDF backup
      const pdf = new jsPDF("l", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(18);
      pdf.text("Qasr-e-Mussarat Marquee", pageW / 2, 16, { align: "center" });
      pdf.setFontSize(13);
      pdf.text("Full Data Backup", pageW / 2, 24, { align: "center" });
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
      pdf.text(`Generated: ${format(new Date(), "d MMMM yyyy HH:mm:ss")}`, pageW / 2, 31, { align: "center" });
      pdf.text(`Tables exported: ${okCount}/${tables.length}`, pageW / 2, 37, { align: "center" });

      let cursorY = 46;
      for (const t of tables) {
        const rows = snapshot[t];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const cols = Object.keys(rows[0]).slice(0, 8); // cap columns to fit landscape
        pdf.addPage();
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
        pdf.text(`${t}  (${rows.length} rows)`, 14, 14);
        autoTable(pdf, {
          startY: 18,
          head: [cols],
          body: rows.map((r: any) => cols.map((c) => {
            const v = r[c];
            if (v === null || v === undefined) return "";
            if (typeof v === "object") return JSON.stringify(v).slice(0, 60);
            const s = String(v);
            return s.length > 60 ? s.slice(0, 57) + "..." : s;
          })),
          styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
          headStyles: { fillColor: [30, 58, 138], textColor: 255 },
          margin: { left: 8, right: 8 },
        });
      }
      // Remove the empty first cover-only? Keep it as cover page.
      const pdfBlob = pdf.output("blob");
      const pdfName = `FULL-BACKUP-${stamp}.pdf`;

      if (backupDir) {
        const ok1 = await writeToBackupFolder(fname, json);
        const ok2 = await writeToBackupFolder(pdfName, pdfBlob);
        if (ok1 || ok2) {
          toast.success(`Full backup saved (JSON + PDF) — ${okCount}/${tables.length} tables`);
          return;
        }
        toast.error("Folder write failed — falling back to ZIP download");
      }
      // Fallback: ZIP with both JSON and PDF
      await downloadZipBackup(
        [{ name: fname, content: json }, { name: pdfName, content: pdfBlob }],
        `FULL-BACKUP-${stamp}.zip`
      );
      toast.success(`Full backup downloaded (JSON + PDF) — ${okCount}/${tables.length} tables`);
    } catch (e: any) {
      toast.error(e.message || "Backup failed");
    } finally {
      setBackingUpAll(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Local Backup System */}
      <div className="glass-effect rounded-lg p-6 border-2 border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Local Desktop Backup</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Pick a folder on your desktop. Every report and full data snapshot will be saved there as a safety copy.
          {!fsaSupported && " Folder picker isn't available in this browser/preview — use the ZIP backup instead, or open the published site in Chrome/Edge desktop."}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={pickBackupFolder} variant="outline">
            <FolderOpen className="h-4 w-4 mr-2" />
            {backupDirName ? `Folder: ${backupDirName}` : "Choose Backup Folder"}
          </Button>
          <Button onClick={backupAllData} disabled={backingUpAll}>
            {backingUpAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {backupDir ? "Backup ALL Data Now" : "Download Full Backup (ZIP)"}
          </Button>
          <label className="flex items-center gap-2 text-sm ml-2">
            <input type="checkbox" checked={autoBackup} onChange={(e) => setAutoBackup(e.target.checked)} />
            Auto-save reports to folder
          </label>
        </div>
        {lastSavedPath && (
          <div className="mt-3 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
            <strong>✓ Last saved to:</strong> <code className="break-all">{lastSavedPath}</code>
          </div>
        )}
        {!fsaSupported && (
          <p className="text-xs text-muted-foreground mt-2">
            Tip: If you're viewing this inside the Lovable editor preview, the browser blocks folder access. Open the published URL in a new tab to use folder backups.
          </p>
        )}
      </div>

      {/* Filter card */}
      <div className="glass-effect rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Booking Payment Summary Report</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Filter bookings by either the date they were booked or the actual event date.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <div>
            <Label>Filter By</Label>
            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="event_date">Event Date</SelectItem>
                <SelectItem value="booking_date">Booking Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Billing Type</Label>
            <Select value={billingFilter} onValueChange={(v) => setBillingFilter(v as BillingFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="per_head">Per Head Event</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="service_cooking">Service &amp; Cooking</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="start">Starting Date</Label>
            <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="end">Ending Date</Label>
            <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button onClick={generateReport} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate Report
          </Button>
        </div>

        {hasSearched && rows.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}><Download className="h-4 w-4 mr-2" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCSV}><FileSpreadsheet className="h-4 w-4 mr-2" /> CSV / Excel</Button>
          </div>
        )}
      </div>

      {/* Report sheet */}
      {hasSearched && (
        <div className="glass-effect rounded-lg p-4 overflow-x-auto">
          <div ref={reportRef} className="bg-white text-black p-6 rounded" style={{ fontFamily: "Arial, sans-serif" }}>
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold">Qasr e Mussarat Marquee &amp; Event Complex</h1>
              <h2 className="text-base">Haroonabad</h2>
              <h2 className="text-base font-semibold">Booking Payment Summary Report</h2>
              <p className="text-sm">
                {filterMode === "event_date" ? "Event Date" : "Booking Date"} — From: {format(new Date(startDate), "d MMMM yyyy")} &nbsp; To: {format(new Date(endDate), "d MMMM yyyy")}
              </p>
            </div>
            <div className="flex justify-end text-xs mb-2">
              <span>Printed on: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}</span>
            </div>

            {rows.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No bookings found in selected date range.</p>
            ) : (
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f3f3" }}>
                    <th style={cellHead}>B_ID</th>
                    <th style={cellHead}>Booking Date</th>
                    <th style={cellHead}>Name</th>
                    <th style={cellHead}>Event</th>
                    <th style={cellHead}>Event Date</th>
                    <th style={cellHead}>Billing Type</th>
                    <th style={cellHead}>Guests</th>
                    <th style={cellHead}>Booked</th>
                    <th style={cellHead}>Received</th>
                    <th style={cellHead}>Balance</th>
                    <th style={cellHead}>Total Exp</th>
                    <th style={cellHead}>Income</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.raw_id}>
                      <td style={cell}>{r.b_id}</td>
                      <td style={cell}>{format(new Date(r.date), "d MMMM yyyy")}</td>
                      <td style={cell}>{r.name}</td>
                      <td style={{ ...cell, textTransform: "capitalize" }}>{r.event}</td>
                      <td style={cell}>{format(new Date(r.edate), "d MMMM yyyy")}</td>
                      <td style={cell}>{BILLING_LABEL[r.billing] || r.billing}</td>
                      <td style={cell}>{r.guests}</td>
                      <td style={cellNum}>{fmt(r.booked)}</td>
                      <td style={cellNum}>{fmt(r.received)}</td>
                      <td style={cellNum}>{fmt(r.balance)}</td>
                      <td style={cellNum}>{fmt(r.total_exp)}</td>
                      <td style={cellNum}>{fmt(r.income)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f3f3f3", fontWeight: "bold" }}>
                    <td style={cell} colSpan={6}>Grand Total</td>
                    <td style={cell}>{totals.guests}</td>
                    <td style={cellNum}>{fmt(totals.booked)}</td>
                    <td style={cellNum}>{fmt(totals.received)}</td>
                    <td style={cellNum}>{fmt(totals.balance)}</td>
                    <td style={cellNum}>{fmt(totals.total_exp)}</td>
                    <td style={cellNum}>{fmt(totals.income)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const cell: React.CSSProperties = { border: "1px solid #333", padding: "6px 8px", textAlign: "center" };
const cellNum: React.CSSProperties = { ...cell, textAlign: "right" };
const cellHead: React.CSSProperties = { ...cell, fontWeight: "bold", background: "#f3f3f3" };

export default PaymentReport;
