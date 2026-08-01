import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Star, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  bookings: {
    name: string;
    email: string;
    event_type: string | null;
    venues: { name: string } | null;
  };
}

const ReviewsManager = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        id, rating, title, comment, is_approved, created_at,
        bookings (name, email, event_type, venues (name))
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReviews(data as unknown as Review[]);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("reviews")
      .update({ is_approved: true })
      .eq("id", id);

    if (error) {
      toast.error("Failed to approve review");
    } else {
      toast.success("Review approved and now visible to public");
      fetchReviews();
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from("reviews")
      .update({ is_approved: false })
      .eq("id", id);

    if (error) {
      toast.error("Failed to reject review");
    } else {
      toast.success("Review rejected");
      fetchReviews();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete review");
    } else {
      toast.success("Review deleted");
      fetchReviews();
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`}
      />
    ));
  };

  const filteredReviews = reviews.filter((review) => {
    if (filter === "pending") return !review.is_approved;
    if (filter === "approved") return review.is_approved;
    return true;
  });

  const pendingCount = reviews.filter((r) => !r.is_approved).length;

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
        <div>
          <CardTitle>Customer Reviews</CardTitle>
          {pendingCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {pendingCount} review{pendingCount > 1 ? "s" : ""} pending approval
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({reviews.length})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === "approved" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("approved")}
          >
            Approved ({reviews.length - pendingCount})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{review.bookings?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {review.bookings?.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex">{renderStars(review.rating)}</div>
                    {review.title && (
                      <div className="font-medium">{review.title}</div>
                    )}
                    {review.comment && (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {review.comment}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {review.bookings?.event_type && (
                      <Badge variant="outline" className="capitalize mb-1">
                        {review.bookings.event_type}
                      </Badge>
                    )}
                    <div className="text-muted-foreground">
                      {review.bookings?.venues?.name || "N/A"}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(review.created_at), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant={review.is_approved ? "default" : "secondary"}>
                    {review.is_approved ? "Approved" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!review.is_approved ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleApprove(review.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReject(review.id)}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(review.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredReviews.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No reviews found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewsManager;
