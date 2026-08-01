import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Venue {
  id: string;
  name: string;
  description: string;
  capacity: number;
  price_per_day: number;
  image_url: string;
  amenities: string[];
}

const VenuesManager = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: 0,
    price_per_day: 0,
    image_url: "",
    amenities: "",
  });

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVenues(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch venues");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amenitiesArray = formData.amenities
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("venues")
          .update({
            name: formData.name,
            description: formData.description,
            capacity: formData.capacity,
            price_per_day: formData.price_per_day,
            image_url: formData.image_url,
            amenities: amenitiesArray,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Venue updated successfully");
      } else {
        const { error } = await supabase.from("venues").insert({
          name: formData.name,
          description: formData.description,
          capacity: formData.capacity,
          price_per_day: formData.price_per_day,
          image_url: formData.image_url,
          amenities: amenitiesArray,
        });

        if (error) throw error;
        toast.success("Venue added successfully");
      }

      resetForm();
      fetchVenues();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteVenue = async (id: string) => {
    try {
      const { error } = await supabase.from("venues").delete().eq("id", id);
      if (error) throw error;
      toast.success("Venue deleted successfully");
      fetchVenues();
    } catch (error: any) {
      toast.error("Failed to delete venue");
    }
  };

  const editVenue = (venue: Venue) => {
    setEditingId(venue.id);
    setFormData({
      name: venue.name,
      description: venue.description || "",
      capacity: venue.capacity,
      price_per_day: venue.price_per_day,
      image_url: venue.image_url || "",
      amenities: venue.amenities?.join(", ") || "",
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      capacity: 0,
      price_per_day: 0,
      image_url: "",
      amenities: "",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>{editingId ? "Edit Venue" : "Add New Venue"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Venue Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label>Price Per Day (Rs.)</Label>
                <Input
                  type="number"
                  value={formData.price_per_day}
                  onChange={(e) => setFormData({ ...formData, price_per_day: parseFloat(e.target.value) })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Amenities (comma-separated)</Label>
              <Input
                value={formData.amenities}
                onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                placeholder="AC, Stage, Parking, etc."
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update" : "Add"} Venue
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => (
          <Card key={venue.id} className="glass-effect">
            {venue.image_url && (
              <img src={venue.image_url} alt={venue.name} className="w-full h-48 object-cover rounded-t-lg" />
            )}
            <CardContent className="p-4">
              <h3 className="text-xl font-bold mb-2">{venue.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{venue.description}</p>
              <div className="space-y-1 text-sm">
                <p><strong>Capacity:</strong> {venue.capacity} guests</p>
                <p><strong>Price:</strong> Rs. {venue.price_per_day.toLocaleString()}/day</p>
                {venue.amenities && venue.amenities.length > 0 && (
                  <p><strong>Amenities:</strong> {venue.amenities.join(", ")}</p>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => editVenue(venue)}>
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteVenue(venue.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default VenuesManager;
