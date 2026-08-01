import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export interface Account {
  id: string;
  account_number: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

const AccountsManager = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ account_number: "", name: "", description: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .order("account_number", { ascending: true });
    if (error) toast.error(error.message);
    else setAccounts((data as Account[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const nextNumber = () => {
    if (accounts.length === 0) return 1;
    return Math.max(...accounts.map((a) => a.account_number)) + 1;
  };

  const addAccount = async () => {
    const num = parseInt(form.account_number) || nextNumber();
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const { error } = await supabase.from("accounts").insert({
      account_number: num,
      name: form.name.trim(),
      description: form.description.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Account added");
    setForm({ account_number: "", name: "", description: "" });
    load();
  };

  const toggleActive = async (a: Account) => {
    const { error } = await supabase.from("accounts").update({ is_active: !a.is_active }).eq("id", a.id);
    if (error) return toast.error(error.message);
    load();
  };

  const deleteAccount = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Number (shortcut)</Label>
            <Input
              type="number"
              placeholder={`${nextNumber()}`}
              value={form.account_number}
              onChange={(e) => setForm({ ...form, account_number: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Name</Label>
            <Input
              placeholder="e.g. Shoaib Fuels"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              placeholder="optional"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="md:col-span-4">
            <Button onClick={addAccount} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : accounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No accounts yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono font-semibold">{a.account_number}</TableCell>
                      <TableCell>{a.name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.description || "-"}</TableCell>
                      <TableCell>
                        <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a)} />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => deleteAccount(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsManager;
