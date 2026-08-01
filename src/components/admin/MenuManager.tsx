import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const SUGGESTED_CATEGORIES = [
  "Chicken", "Mutton", "Beef", "Fish", "Vegetarian",
  "Rice & Biryani", "BBQ", "Bread", "Salad", "Dessert", "Drinks", "Appetizer",
];

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

const MenuManager = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNewCategory, setAddingNewCategory] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    category: "",
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .order("category", { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch menu items");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from("menu_items")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Menu item updated successfully");
      } else {
        const { error } = await supabase.from("menu_items").insert(formData);
        if (error) throw error;
        toast.success("Menu item added successfully");
      }

      resetForm();
      fetchMenuItems();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteMenuItem = async (id: string) => {
    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);
      if (error) throw error;
      toast.success("Menu item deleted successfully");
      fetchMenuItems();
    } catch (error: any) {
      toast.error("Failed to delete menu item");
    }
  };

  const editMenuItem = (item: MenuItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price,
      category: item.category,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      category: "",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Combine existing categories from db with suggested defaults
  const existingCategories = Array.from(new Set(menuItems.map((m) => m.category).filter(Boolean)));
  const allCategories = Array.from(new Set([...existingCategories, ...SUGGESTED_CATEGORIES]));

  // Group items by category for display
  const grouped = menuItems.reduce((acc, item) => {
    const cat = item.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>{editingId ? "Edit Menu Item" : "Add New Menu Item"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Item Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Chicken Karahi"
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                {addingNewCategory ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Type new category"
                      required
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setAddingNewCategory(false)}>
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {allCategories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Add new category"
                      onClick={() => { setFormData({ ...formData, category: "" }); setAddingNewCategory(true); }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>Price (Rs. per person)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Spicy chicken cooked in tomato gravy"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update" : "Add"} Menu Item
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>All Menu Items (grouped by category)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No menu items yet. Add your first one above.
            </p>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="font-semibold text-lg mb-2 text-primary">{category} <span className="text-xs text-muted-foreground">({items.length})</span></h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>Rs. {item.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editMenuItem(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteMenuItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuManager;
