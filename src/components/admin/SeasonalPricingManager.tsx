import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Loader2, CalendarRange, Percent } from "lucide-react";
import { format } from "date-fns";

interface SeasonalPricing {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_multiplier: number;
  is_active: boolean;
  created_at: string;
}

const SeasonalPricingManager = () => {
  const [seasons, setSeasons] = useState<SeasonalPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<SeasonalPricing | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    price_multiplier: "1.0",
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    const { data, error } = await supabase
      .from("seasonal_pricing")
      .select("*")
      .order("start_date", { ascending: true });

    if (!error && data) {
      setSeasons(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const multiplier = parseFloat(formData.price_multiplier);
    if (isNaN(multiplier) || multiplier < 0.1 || multiplier > 5) {
      toast.error("Price multiplier must be between 0.1 and 5");
      return;
    }

    try {
      if (editingSeason) {
        const { error } = await supabase
          .from("seasonal_pricing")
          .update({
            name: formData.name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            price_multiplier: multiplier,
          })
          .eq("id", editingSeason.id);

        if (error) throw error;
        toast.success("Season updated");
      } else {
        const { error } = await supabase.from("seasonal_pricing").insert({
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          price_multiplier: multiplier,
        });

        if (error) throw error;
        toast.success("Season added");
      }

      setDialogOpen(false);
      setEditingSeason(null);
      setFormData({ name: "", start_date: "", end_date: "", price_multiplier: "1.0" });
      fetchSeasons();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (season: SeasonalPricing) => {
    setEditingSeason(season);
    setFormData({
      name: season.name,
      start_date: season.start_date,
      end_date: season.end_date,
      price_multiplier: season.price_multiplier.toString(),
    });
    setDialogOpen(true);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("seasonal_pricing")
      .update({ is_active: !isActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update season status");
    } else {
      toast.success(`Season ${isActive ? "deactivated" : "activated"}`);
      fetchSeasons();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this season?")) return;

    const { error } = await supabase.from("seasonal_pricing").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete season");
    } else {
      toast.success("Season deleted");
      fetchSeasons();
    }
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier > 1.3) return "bg-red-500";
    if (multiplier > 1) return "bg-orange-500";
    if (multiplier < 1) return "bg-green-500";
    return "bg-gray-500";
  };

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
        <CardTitle>Seasonal Pricing</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingSeason(null);
            setFormData({ name: "", start_date: "", end_date: "", price_multiplier: "1.0" });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Season
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSeason ? "Edit Season" : "Add Season"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Season Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Wedding Season, Holiday Peak"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="multiplier">Price Multiplier *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="multiplier"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5"
                    value={formData.price_multiplier}
                    onChange={(e) => setFormData({ ...formData, price_multiplier: e.target.value })}
                    required
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    ({((parseFloat(formData.price_multiplier) || 1) - 1) * 100 >= 0 ? "+" : ""}
                    {(((parseFloat(formData.price_multiplier) || 1) - 1) * 100).toFixed(0)}%)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  1.0 = Normal price, 1.5 = 50% increase, 0.8 = 20% discount
                </p>
              </div>
              <Button type="submit" className="w-full">
                {editingSeason ? "Update" : "Add"} Season
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Season</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Multiplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {seasons.map((season) => (
              <TableRow key={season.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 text-primary" />
                    <span className="font-medium">{season.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(season.start_date), "MMM dd, yyyy")} -{" "}
                  {format(new Date(season.end_date), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge className={getMultiplierColor(season.price_multiplier)}>
                    <Percent className="h-3 w-3 mr-1" />
                    {season.price_multiplier}x
                    ({((season.price_multiplier - 1) * 100).toFixed(0)}%)
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={season.is_active ? "default" : "secondary"}>
                    {season.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(season)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(season.id, season.is_active)}
                    >
                      {season.is_active ? "🔴" : "🟢"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(season.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {seasons.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No seasonal pricing configured. Add your first season above.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SeasonalPricingManager;
