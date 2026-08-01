import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Loader2, CheckCircle2, Circle } from "lucide-react";

interface ChecklistItem {
  id: string;
  item: string;
  is_completed: boolean;
}

interface EventChecklistProps {
  bookingId: string;
}

const EventChecklist = ({ bookingId }: EventChecklistProps) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const defaultItems = [
    "Confirm final guest count",
    "Finalize menu selections",
    "Arrange photography/videography",
    "Confirm decoration details",
    "Arrange transportation",
    "Prepare guest list",
    "Final payment",
  ];

  useEffect(() => {
    fetchChecklist();
  }, [bookingId]);

  const fetchChecklist = async () => {
    const { data, error } = await supabase
      .from("booking_checklist")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      if (data.length === 0) {
        // Initialize with default items
        await initializeDefaultItems();
      } else {
        setItems(data);
      }
    }
    setLoading(false);
  };

  const initializeDefaultItems = async () => {
    const itemsToInsert = defaultItems.map((item) => ({
      booking_id: bookingId,
      item,
      is_completed: false,
    }));

    const { data, error } = await supabase
      .from("booking_checklist")
      .insert(itemsToInsert)
      .select();

    if (!error && data) {
      setItems(data);
    }
  };

  const toggleItem = async (id: string, isCompleted: boolean) => {
    const { error } = await supabase
      .from("booking_checklist")
      .update({ is_completed: !isCompleted })
      .eq("id", id);

    if (!error) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_completed: !isCompleted } : item
        )
      );
    }
  };

  const addItem = async () => {
    if (!newItem.trim()) return;

    setAdding(true);
    const { data, error } = await supabase
      .from("booking_checklist")
      .insert({
        booking_id: bookingId,
        item: newItem.trim(),
        is_completed: false,
      })
      .select()
      .single();

    if (!error && data) {
      setItems((prev) => [...prev, data]);
      setNewItem("");
    } else {
      toast.error("Failed to add item");
    }
    setAdding(false);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from("booking_checklist")
      .delete()
      .eq("id", id);

    if (!error) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const completedCount = items.filter((i) => i.is_completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Event Checklist</CardTitle>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{items.length} completed
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              item.is_completed ? "bg-primary/5" : "hover:bg-muted"
            }`}
          >
            <Checkbox
              id={item.id}
              checked={item.is_completed}
              onCheckedChange={() => toggleItem(item.id, item.is_completed)}
            />
            <label
              htmlFor={item.id}
              className={`flex-1 text-sm cursor-pointer ${
                item.is_completed ? "line-through text-muted-foreground" : ""
              }`}
            >
              {item.item}
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => deleteItem(item.id)}
            >
              ×
            </Button>
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <Input
            placeholder="Add a new item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addItem()}
            disabled={adding}
          />
          <Button onClick={addItem} disabled={adding || !newItem.trim()} size="icon">
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventChecklist;
