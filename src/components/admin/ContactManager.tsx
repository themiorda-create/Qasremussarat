import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ContactInfo {
  id: string;
  email: string;
  phone: string;
  address: string;
  whatsapp: string;
}

const ContactManager = () => {
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<ContactInfo>({
    id: "",
    email: "",
    phone: "",
    address: "",
    whatsapp: "",
  });

  useEffect(() => {
    fetchContactInfo();
  }, []);

  const fetchContactInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_info")
        .select("*")
        .single();

      if (error) throw error;
      if (data) setFormData(data);
    } catch (error: any) {
      toast.error("Failed to fetch contact info");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("contact_info")
        .update({
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          whatsapp: formData.whatsapp,
        })
        .eq("id", formData.id);

      if (error) throw error;
      toast.success("Contact info updated successfully");
      fetchContactInfo();
    } catch (error: any) {
      toast.error("Failed to update contact info");
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
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle>Edit Contact Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
              rows={4}
            />
          </div>
          <Button type="submit">Update Contact Info</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ContactManager;
