import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, ShoppingBag, Filter } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

interface DigitalProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  preview_image_url: string | null;
  event_type: string | null;
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "invitation", label: "Invitation Cards" },
  { value: "birthday_card", label: "Birthday Cards" },
  { value: "table_card", label: "Table Cards" },
  { value: "thank_you", label: "Thank You Cards" },
  { value: "menu_card", label: "Menu Cards" },
  { value: "save_the_date", label: "Save the Date" },
  { value: "program", label: "Programs" },
  { value: "other", label: "Other" },
];

const EVENT_TYPES = [
  { value: "all", label: "All Events" },
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "corporate", label: "Corporate" },
  { value: "engagement", label: "Engagement" },
  { value: "other", label: "Other" },
];

const DigitalProducts = () => {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("digital_products")
      .select("id, name, description, category, price, preview_image_url, is_active, event_type, created_at, updated_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load products");
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleDownload = async (product: DigitalProduct) => {
    if (!user) {
      toast.error("Please sign in to download products");
      return;
    }

    setDownloading(product.id);
    try {
      // Fetch the download path (only accessible to signed-in users)
      const { data: full, error: fetchErr } = await supabase
        .from("digital_products")
        .select("download_url")
        .eq("id", product.id)
        .maybeSingle();

      if (fetchErr || !full?.download_url) {
        toast.error("Download not available");
        return;
      }

      // Record the purchase/download
      await supabase.from("digital_product_purchases").insert({
        user_id: user.id,
        product_id: product.id,
      });

      // Download the file
      const { data, error } = await supabase.storage
        .from("digital-downloads")
        .download(full.download_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = product.name + "." + (full.download_url.split(".").pop() || "pdf");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Download started!");
    } catch (error) {
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const filtered = products.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (eventFilter !== "all" && p.event_type !== eventFilter) return false;
    return true;
  });

  const getCategoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO title="Digital Products — Wedding Stationery & Templates" description="Browse and download digital wedding invitations, templates, and event stationery from Qasr-e-Mussarat." path="/digital-products" />
      <Navbar />


      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Digital Products</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Beautiful, ready-to-use event stationery — invitation cards, table cards, menu cards, and more.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-b bg-background">
        <div className="container mx-auto px-4 flex flex-wrap gap-4 items-center">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((e) => (
                <SelectItem key={e.value} value={e.value}>
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </section>

      {/* Products Grid */}
      <section className="flex-1 py-10">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Products Found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    {product.preview_image_url ? (
                      <img
                        src={product.preview_image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryLabel(product.category)}
                      </Badge>
                      {product.event_type && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {product.event_type}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <p className="text-lg font-bold text-primary">
                      {product.price === 0 ? "Free" : `Rs. ${product.price.toLocaleString()}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.preview_image_url && (
                <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                  <img
                    src={selectedProduct.preview_image_url}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{getCategoryLabel(selectedProduct.category)}</Badge>
                {selectedProduct.event_type && (
                  <Badge variant="outline" className="capitalize">{selectedProduct.event_type}</Badge>
                )}
              </div>
              {selectedProduct.description && (
                <p className="text-muted-foreground">{selectedProduct.description}</p>
              )}
              <div className="flex items-center justify-between pt-2 border-t">
                <p className="text-2xl font-bold text-primary">
                  {selectedProduct.price === 0 ? "Free" : `Rs. ${selectedProduct.price.toLocaleString()}`}
                </p>
                <Button
                  variant="gold"
                  onClick={() => handleDownload(selectedProduct)}
                  disabled={downloading === selectedProduct.id}
                >
                  {downloading === selectedProduct.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {selectedProduct.price === 0 ? "Download Free" : "Download"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default DigitalProducts;
