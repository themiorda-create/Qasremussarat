import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Loader2, Package } from "lucide-react";

interface AddonService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_active: boolean;
  created_at: string;
}

const AddonsManager = () => {
  const [addons, setAddons] = useState<AddonService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<AddonService | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "other",
  });

  useEffect(() => {
    fetchAddons();
  }, []);

  const fetchAddons = async () => {
    const { data, error } = await supabase
      .from("addon_services")
      .select("*")
      .order("category, name");

    if (!error && data) {
      setAddons(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      if (editingAddon) {
        const { error } = await supabase
          .from("addon_services")
          .update({
            name: formData.name,
            description: formData.description || null,
            price,
            category: formData.category,
          })
          .eq("id", editingAddon.id);

        if (error) throw error;
        toast.success("Add-on updated");
      } else {
        const { error } = await supabase.from("addon_services").insert({
          name: formData.name,
          description: formData.description || null,
          price,
          category: formData.category,
        });

        if (error) throw error;
        toast.success("Add-on created");
      }

      setDialogOpen(false);
      setEditingAddon(null);
      setFormData({ name: "", description: "", price: "", category: "other" });
      fetchAddons();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (addon: AddonService) => {
    setEditingAddon(addon);
    setFormData({
      name: addon.name,
      description: addon.description || "",
      price: addon.price.toString(),
      category: addon.category,
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("addon_services")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update add-on status");
    } else {
      toast.success(`Add-on ${isActive ? "deactivated" : "activated"}`);
      fetchAddons();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this add-on?")) return;

    const { error } = await supabase.from("addon_services").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete add-on");
    } else {
      toast.success("Add-on deleted");
      fetchAddons();
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "photography":
        return "bg-purple-500";
      case "entertainment":
        return "bg-pink-500";
      case "decoration":
        return "bg-green-500";
      case "beauty":
        return "bg-rose-500";
      case "service":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  // Group addons by category
  const groupedAddons = addons.reduce((acc, addon) => {
    if (!acc[addon.category]) acc[addon.category] = [];
    acc[addon.category].push(addon);
    return acc;
  }, {} as Record<string, AddonService[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Add-on Services</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingAddon(null);
            setFormData({ name: "", description: "", price: "", category: "other" });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAddon ? "Edit Add-on" : "Add New Service"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Photography Package"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the service..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (Rs.) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photography">Photography</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="decoration">Decoration</SelectItem>
                      <SelectItem value="beauty">Beauty</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingAddon ? "Update" : "Add"} Service
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addons.map((addon) => (
              <TableRow key={addon.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium">{addon.name}</div>
                      {addon.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {addon.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getCategoryColor(addon.category)}>
                    {addon.category}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  Rs. {addon.price.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={addon.is_active ? "default" : "secondary"}>
                    {addon.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(addon)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(addon.id, addon.is_active)}
                    >
                      {addon.is_active ? "🔴" : "🟢"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(addon.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {addons.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No add-on services yet. Add your first service above.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AddonsManager;
