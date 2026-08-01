import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, FolderOpen, Download, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Account {
  id: string;
  account_number: number;
  name: string;
  is_active: boolean;
}

interface LedgerEntry {
  id: string;
  voucher_number: string;
  entry_date: string;
  debit_account_id: string | null;
  credit_account_id: string | null;
  amount: number;
  description: string | null;
  reference: string | null;
  booking_id: string | null;
}

// IndexedDB helpers to persist directory handle
const DB_NAME = "qem-backup";
const STORE = "handles";
async function idbGet(key: string): Promise<any> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const tx = req.result.transaction(STORE, "readonly");
      const g = tx.objectStore(STORE).get(key);
      g.onsuccess = () => resolve(g.result);
      g.onerror = () => resolve(null);
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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const LedgerManager = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nextVoucher, setNextVoucher] = useState("V-0001");

  // form state
  const [entryDate, setEntryDate] = useState(today);
  const [debitNum, setDebitNum] = useState("");
  const [creditNum, setCreditNum] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");

  // filters
  const firstOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
  const [filterStart, setFilterStart] = useState(firstOfMonth);
  const [filterEnd, setFilterEnd] = useState(today);

  // backup
  const [backupDir, setBackupDir] = useState<any>(null);
  const [backupDirName, setBackupDirName] = useState<string>("");
  const [lastSavedPath, setLastSavedPath] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [{ data: accData }, { data: entryData }] = await Promise.all([
      supabase.from("accounts").select("id, account_number, name, is_active").order("account_number"),
      supabase.from("ledger_entries").select("*").order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
    ]);
    setAccounts((accData as Account[]) || []);
    const list = (entryData as LedgerEntry[]) || [];
    setEntries(list);
    // compute next voucher
    const maxNum = list.reduce((m, e) => {
      const n = parseInt((e.voucher_number || "").replace(/\D/g, ""));
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    setNextVoucher(`V-${String(maxNum + 1).padStart(4, "0")}`);
    setLoading(false);
  };

  useEffect(() => {
    load();
    (async () => {
      const h = await idbGet("ledgerDir");
      if (h) {
        setBackupDir(h);
        setBackupDirName(h.name || "Selected folder");
      }
    })();
  }, []);

  const accountByNumber = (num: string) => accounts.find((a) => a.account_number === parseInt(num));
  const accountName = (id: string | null) => (id ? accounts.find((a) => a.id === id)?.name || "-" : "-");

  const debitAcc = accountByNumber(debitNum);
  const creditAcc = accountByNumber(creditNum);

  const pickBackupFolder = async () => {
    try {
      // @ts-ignore
      if (!window.showDirectoryPicker) {
        return toast.error("Folder picking only works on Chrome/Edge desktop on the published site.");
      }
      // @ts-ignore
      const h = await window.showDirectoryPicker({ mode: "readwrite" });
      const perm = await h.requestPermission({ mode: "readwrite" });
      if (perm !== "granted") return toast.error("Write permission denied");
      await idbSet("ledgerDir", h);
      setBackupDir(h);
      setBackupDirName(h.name);
      toast.success(`Backup folder set: ${h.name}`);
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message || "Could not pick folder");
    }
  };

  const buildDailyPdf = (dateStr: string, dayEntries: LedgerEntry[], accs: Account[]) => {
    const doc = new jsPDF();
    const acctMap = new Map(accs.map((a) => [a.id, a]));
    doc.setFontSize(16);
    doc.text("Qasr-e-Mussarat Marquee — Daily Ledger", 14, 15);
    doc.setFontSize(11);
    doc.text(`Date: ${format(parseISO(dateStr), "EEEE, MMMM d, yyyy")}`, 14, 23);
    doc.text(`Entries: ${dayEntries.length}`, 14, 29);

    const rows = dayEntries.map((e) => [
      e.voucher_number,
      e.reference || "-",
      acctMap.get(e.debit_account_id || "")?.name || "-",
      acctMap.get(e.credit_account_id || "")?.name || "-",
      e.description || "-",
      Number(e.amount).toFixed(2),
      Number(e.amount).toFixed(2),
    ]);
    const total = dayEntries.reduce((s, e) => s + Number(e.amount), 0);

    autoTable(doc, {
      startY: 35,
      head: [["Voucher", "Ref", "Debit A/C", "Credit A/C", "Description", "Debit", "Credit"]],
      body: rows,
      foot: [["", "", "", "", "Totals", total.toFixed(2), total.toFixed(2)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 82] },
      footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
    });

    return doc;
  };

  const writePdfToBackup = async (dateStr: string, dayEntries: LedgerEntry[], accs: Account[]) => {
    if (!backupDir) return null;
    const d = parseISO(dateStr);
    const year = format(d, "yyyy");
    const monthFolder = `${format(d, "yyyy-MM")} ${MONTHS[d.getMonth()]}`;
    const fileName = `${dateStr}.pdf`;
    try {
      const rootHandle = await backupDir.getDirectoryHandle("LedgerBackup", { create: true });
      const yearHandle = await rootHandle.getDirectoryHandle(year, { create: true });
      const monthHandle = await yearHandle.getDirectoryHandle(monthFolder, { create: true });
      const fileHandle = await monthHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      const doc = buildDailyPdf(dateStr, dayEntries, accs);
      const blob = doc.output("blob");
      await writable.write(blob);
      await writable.close();
      const path = `${backupDirName}/LedgerBackup/${year}/${monthFolder}/${fileName}`;
      setLastSavedPath(path);
      return path;
    } catch (e: any) {
      toast.error(`Backup write failed: ${e?.message || e}`);
      return null;
    }
  };

  const saveEntry = async () => {
    if (!debitAcc) return toast.error(`Debit account #${debitNum} not found`);
    if (!creditAcc) return toast.error(`Credit account #${creditNum} not found`);
    if (debitAcc.id === creditAcc.id) return toast.error("Debit and Credit must be different accounts");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Amount required");
    setSaving(true);
    const { data, error } = await supabase
      .from("ledger_entries")
      .insert({
        voucher_number: nextVoucher,
        entry_date: entryDate,
        debit_account_id: debitAcc.id,
        credit_account_id: creditAcc.id,
        amount: amt,
        description: description.trim() || null,
        reference: reference.trim() || null,
      })
      .select("*")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${nextVoucher}`);
    setAmount("");
    setDescription("");
    setReference("");
    setDebitNum("");
    setCreditNum("");
    // refresh then backup
    await load();
    if (backupDir) {
      // refetch entries for the given date
      const { data: dayData } = await supabase
        .from("ledger_entries")
        .select("*")
        .eq("entry_date", entryDate);
      const path = await writePdfToBackup(entryDate, (dayData as LedgerEntry[]) || [], accounts);
      if (path) toast.success(`Saved locally: ${path}`);
    }
  };

  const backupAll = async () => {
    if (!backupDir) return toast.error("Pick a backup folder first");
    const byDate = new Map<string, LedgerEntry[]>();
    for (const e of entries) {
      const arr = byDate.get(e.entry_date) || [];
      arr.push(e);
      byDate.set(e.entry_date, arr);
    }
    let count = 0;
    for (const [d, arr] of byDate) {
      await writePdfToBackup(d, arr, accounts);
      count++;
    }
    toast.success(`Backed up ${count} day file(s) to ${backupDirName}/LedgerBackup/`);
  };

  const filtered = useMemo(
    () => entries.filter((e) => e.entry_date >= filterStart && e.entry_date <= filterEnd),
    [entries, filterStart, filterEnd]
  );

  const totalDebit = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const totalCredit = totalDebit; // each entry is balanced
  const diff = totalDebit - totalCredit;

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Ledger ${filterStart} to ${filterEnd}`, 14, 15);
    autoTable(doc, {
      startY: 22,
      head: [["Voucher", "Date", "Debit A/C", "Credit A/C", "Description", "Debit", "Credit"]],
      body: filtered.map((e) => [
        e.voucher_number,
        e.entry_date,
        accountName(e.debit_account_id),
        accountName(e.credit_account_id),
        e.description || "-",
        Number(e.amount).toFixed(2),
        Number(e.amount).toFixed(2),
      ]),
      foot: [["", "", "", "", "Totals", totalDebit.toFixed(2), totalCredit.toFixed(2)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 82] },
      footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
    });
    doc.save(`Ledger-${filterStart}_to_${filterEnd}.pdf`);
  };

  // ---- Monthly export (select year + month) ----
  const now = new Date();
  const [expYear, setExpYear] = useState(String(now.getFullYear()));
  const [expMonth, setExpMonth] = useState(String(now.getMonth() + 1));

  const monthEntries = useMemo(() => {
    const prefix = `${expYear}-${String(Number(expMonth)).padStart(2, "0")}`;
    return entries
      .filter((e) => (e.entry_date || "").startsWith(prefix))
      .slice()
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  }, [entries, expYear, expMonth]);

  const monthLabel = `${MONTHS[Number(expMonth) - 1]}-${expYear}`;

  const exportMonthCsv = () => {
    if (monthEntries.length === 0) return toast.error(`No entries for ${monthLabel}`);
    const head = ["Voucher", "Date", "Debit A/C", "Credit A/C", "Description", "Reference", "Debit", "Credit"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const total = monthEntries.reduce((s, e) => s + Number(e.amount), 0);
    const rows = monthEntries.map((e) =>
      [
        e.voucher_number,
        e.entry_date,
        accountName(e.debit_account_id),
        accountName(e.credit_account_id),
        e.description || "",
        e.reference || "",
        Number(e.amount).toFixed(2),
        Number(e.amount).toFixed(2),
      ].map(esc).join(",")
    );
    rows.push(["", "", "", "", "", "Totals", total.toFixed(2), total.toFixed(2)].map(esc).join(","));
    const csv = [head.map(esc).join(","), ...rows].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ledger-${monthLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${monthEntries.length} entries (CSV)`);
  };

  const exportMonthPdf = () => {
    if (monthEntries.length === 0) return toast.error(`No entries for ${monthLabel}`);
    const total = monthEntries.reduce((s, e) => s + Number(e.amount), 0);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Qasr-e-Mussarat Marquee — Monthly Ledger", 14, 15);
    doc.setFontSize(11);
    doc.text(`Month: ${monthLabel}`, 14, 23);
    doc.text(`Entries: ${monthEntries.length}`, 14, 29);
    autoTable(doc, {
      startY: 35,
      head: [["Voucher", "Date", "Debit A/C", "Credit A/C", "Description", "Ref", "Debit", "Credit"]],
      body: monthEntries.map((e) => [
        e.voucher_number,
        e.entry_date,
        accountName(e.debit_account_id),
        accountName(e.credit_account_id),
        e.description || "-",
        e.reference || "-",
        Number(e.amount).toFixed(2),
        Number(e.amount).toFixed(2),
      ]),
      foot: [["", "", "", "", "", "Totals", total.toFixed(2), total.toFixed(2)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 82] },
      footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: "bold" },
    });
    doc.save(`Ledger-${monthLabel}.pdf`);
    toast.success(`Exported ${monthEntries.length} entries (PDF)`);
  };

  return (
    <div className="space-y-6">
      {/* Backup panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Local Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" onClick={pickBackupFolder}>
              <FolderOpen className="h-4 w-4 mr-2" />
              {backupDirName ? `Folder: ${backupDirName}` : "Pick Backup Folder"}
            </Button>
            <Button variant="secondary" onClick={backupAll} disabled={!backupDir}>
              <Save className="h-4 w-4 mr-2" /> Backup All Ledger Now
            </Button>
          </div>
          {lastSavedPath && (
            <div className="text-xs bg-green-50 border border-green-200 text-green-900 rounded px-3 py-2">
              ✓ Last saved: <span className="font-mono">{lastSavedPath}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Files are organized as <span className="font-mono">LedgerBackup/YYYY/YYYY-MM Month/YYYY-MM-DD.pdf</span>.
            Chrome/Edge desktop on the published site only.
          </p>
        </CardContent>
      </Card>

      {/* Entry form */}
      <Card>
        <CardHeader>
          <CardTitle>New Payment / Ledger Entry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Voucher #</Label>
            <Input value={nextVoucher} readOnly className="font-mono" />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div>
            <Label>Booking / Reference #</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="optional" />
          </div>

          <div>
            <Label>Debit A/C (received into)</Label>
            <Input
              type="number"
              value={debitNum}
              onChange={(e) => setDebitNum(e.target.value)}
              placeholder="Enter A/C # e.g. 1"
            />
            <select
              className="mt-2 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={debitAcc?.account_number ?? ""}
              onChange={(e) => setDebitNum(e.target.value)}
            >
              <option value="">— or select by name —</option>
              {accounts.filter((a) => a.is_active).map((a) => (
                <option key={a.id} value={a.account_number}>
                  {a.account_number} — {a.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {debitAcc ? `✓ ${debitAcc.name}` : debitNum ? "No account with that number" : " "}
            </p>
          </div>
          <div>
            <Label>Credit A/C (paid from)</Label>
            <Input
              type="number"
              value={creditNum}
              onChange={(e) => setCreditNum(e.target.value)}
              placeholder="Enter A/C # e.g. 2"
            />
            <select
              className="mt-2 w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={creditAcc?.account_number ?? ""}
              onChange={(e) => setCreditNum(e.target.value)}
            >
              <option value="">— or select by name —</option>
              {accounts.filter((a) => a.is_active).map((a) => (
                <option key={a.id} value={a.account_number}>
                  {a.account_number} — {a.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {creditAcc ? `✓ ${creditAcc.name}` : creditNum ? "No account with that number" : " "}
            </p>
          </div>

          <div>
            <Label>Amount</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          <div className="md:col-span-3">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="md:col-span-3">
            <Button onClick={saveEntry} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Entry
            </Button>
          </div>

          {accounts.length > 0 && (
            <div className="md:col-span-3 text-xs text-muted-foreground border-t pt-3">
              <strong>Account numbers:</strong>{" "}
              {accounts.filter((a) => a.is_active).map((a) => `${a.account_number}=${a.name}`).join(" · ")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger table */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label>From</Label>
              <Input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
            </div>
            <Button variant="outline" onClick={exportPdf} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export PDF
            </Button>
          </div>

          {/* Monthly export */}
          <div className="flex flex-wrap gap-3 items-end border-t pt-3">
            <div>
              <Label>Export Year</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value)}
              >
                {Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Export Month</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <Button variant="outline" onClick={exportMonthCsv}>
              <Download className="h-4 w-4 mr-2" /> Export {monthLabel} CSV
            </Button>
            <Button variant="outline" onClick={exportMonthPdf}>
              <Download className="h-4 w-4 mr-2" /> Export {monthLabel} PDF
            </Button>
            <span className="text-xs text-muted-foreground">{monthEntries.length} entries</span>
          </div>


          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">No entries in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Debit A/C</TableHead>
                    <TableHead>Credit A/C</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Ref</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono">{e.voucher_number}</TableCell>
                      <TableCell>{e.entry_date}</TableCell>
                      <TableCell>{accountName(e.debit_account_id)}</TableCell>
                      <TableCell>{accountName(e.credit_account_id)}</TableCell>
                      <TableCell>{e.description || "-"}</TableCell>
                      <TableCell>{e.reference || "-"}</TableCell>
                      <TableCell className="text-right font-mono">{Number(e.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{Number(e.amount).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="font-bold text-right">Totals</TableCell>
                    <TableCell className="text-right font-mono font-bold">{totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{totalCredit.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={6} className="text-right text-sm text-muted-foreground">Difference</TableCell>
                    <TableCell colSpan={2} className="text-right font-mono">{diff.toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LedgerManager;
