import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Upload, Download } from "lucide-react";
import { toast } from "sonner";

interface DigitalProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  preview_image_url: string | null;
  download_url: string | null;
  is_active: boolean;
  event_type: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "invitation", label: "Invitation Card" },
  { value: "birthday_card", label: "Birthday Card" },
  { value: "table_card", label: "Table Card" },
  { value: "thank_you", label: "Thank You Card" },
  { value: "menu_card", label: "Menu Card" },
  { value: "save_the_date", label: "Save the Date" },
  { value: "program", label: "Program" },
  { value: "other", label: "Other" },
];

const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "corporate", label: "Corporate" },
  { value: "engagement", label: "Engagement" },
  { value: "other", label: "Other" },
];

const DigitalProductsManager = () => {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DigitalProduct | null>(null);
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "invitation",
    price: 0,
    preview_image_url: "",
    download_url: "",
    is_active: true,
    event_type: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("digital_products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load products");
    else setProducts(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: "", description: "", category: "invitation", price: 0, preview_image_url: "", download_url: "", is_active: true, event_type: "" });
    setEditingProduct(null);
  };

  const openEdit = (product: DigitalProduct) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || "",
      category: product.category,
      price: product.price,
      preview_image_url: product.preview_image_url || "",
      download_url: product.download_url || "",
      is_active: product.is_active,
      event_type: product.event_type || "",
    });
    setDialogOpen(true);
  };

  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPreview(true);
    const path = `previews/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("digital-products").upload(path, file);
    if (error) {
      toast.error("Preview upload failed");
    } else {
      const { data: urlData } = supabase.storage.from("digital-products").getPublicUrl(path);
      setForm((f) => ({ ...f, preview_image_url: urlData.publicUrl }));
      toast.success("Preview uploaded");
    }
    setUploadingPreview(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    const path = `files/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("digital-downloads").upload(path, file);
    if (error) {
      toast.error("File upload failed");
    } else {
      setForm((f) => ({ ...f, download_url: path }));
      toast.success("File uploaded");
    }
    setUploadingFile(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category,
      price: form.price,
      preview_image_url: form.preview_image_url || null,
      download_url: form.download_url || null,
      is_active: form.is_active,
      event_type: form.event_type || null,
    };

    if (editingProduct) {
      const { error } = await supabase.from("digital_products").update(payload).eq("id", editingProduct.id);
      if (error) toast.error("Failed to update product");
      else toast.success("Product updated");
    } else {
      const { error } = await supabase.from("digital_products").insert(payload);
      if (error) toast.error("Failed to create product");
      else toast.success("Product created");
    }
    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("digital_products").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Product deleted");
      fetchProducts();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("digital_products").update({ is_active: !current }).eq("id", id);
    fetchProducts();
  };

  const getCategoryLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label || cat;

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Digital Products</h2>
          <p className="text-muted-foreground">Manage event stationery templates</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Event Type</Label>
                  <Select value={form.event_type || "none"} onValueChange={(v) => setForm((f) => ({ ...f, event_type: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {EVENT_TYPES.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Price (Rs.) — 0 for free</Label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Preview Image</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={handlePreviewUpload} disabled={uploadingPreview} />
                  {uploadingPreview && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {form.preview_image_url && (
                  <img src={form.preview_image_url} alt="Preview" className="mt-2 h-24 rounded border object-cover" />
                )}
              </div>
              <div>
                <Label>Downloadable File (any type — PDF, APK, ZIP, image, video, etc.)</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" onChange={handleFileUpload} disabled={uploadingFile} />
                  {uploadingFile && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {form.download_url && <p className="text-xs text-muted-foreground mt-1 break-all">File: {form.download_url}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingProduct ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.preview_image_url ? (
                        <img src={product.preview_image_url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Download className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.event_type && <p className="text-xs text-muted-foreground capitalize">{product.event_type}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{getCategoryLabel(product.category)}</Badge></TableCell>
                  <TableCell>{product.price === 0 ? "Free" : `Rs. ${product.price}`}</TableCell>
                  <TableCell>
                    <Switch checked={product.is_active} onCheckedChange={() => toggleActive(product.id, product.is_active)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(product)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No products yet. Click "Add Product" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DigitalProductsManager;
