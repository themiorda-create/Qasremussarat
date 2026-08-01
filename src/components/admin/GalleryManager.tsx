import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GalleryImage {
  id: string;
  image_url: string;
  category: string;
  title: string;
  created_at: string;
}

const GalleryManager = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    image_url: "",
    category: "Wedding",
    title: "",
  });

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch images");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("gallery_images").insert([formData]);

      if (error) throw error;
      toast.success("Image added successfully");
      setFormData({ image_url: "", category: "Wedding", title: "" });
      fetchImages();
    } catch (error: any) {
      toast.error("Failed to add image");
    }
  };

  const deleteImage = async (id: string) => {
    try {
      const { error } = await supabase.from("gallery_images").delete().eq("id", id);
      if (error) throw error;
      toast.success("Image deleted successfully");
      fetchImages();
    } catch (error: any) {
      toast.error("Failed to delete image");
    }
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
          <CardTitle>Add Gallery Image</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
                required
              />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Image title"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wedding">Wedding</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                  <SelectItem value="Birthday">Birthday</SelectItem>
                  <SelectItem value="Mehndi">Mehndi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Add Image</Button>
          </form>
        </CardContent>
      </Card>

      <div className="glass-effect rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">All Gallery Images</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <Card key={image.id}>
              <CardContent className="p-4">
                <img
                  src={image.image_url}
                  alt={image.title}
                  className="w-full h-48 object-cover rounded-lg mb-2"
                />
                <p className="font-semibold">{image.title || "Untitled"}</p>
                <p className="text-sm text-muted-foreground">{image.category}</p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => deleteImage(image.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryManager;
