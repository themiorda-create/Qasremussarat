import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { format } from "date-fns";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  bookings: {
    name: string;
    event_type: string | null;
    venues: { name: string } | null;
  };
}

const ReviewsSection = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select(`
        id, rating, title, comment, created_at,
        bookings (name, event_type, venues (name))
      `)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (!error && data) {
      setReviews(data as unknown as Review[]);
    }
    setLoading(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`}
      />
    ));
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";

  if (loading) {
    return (
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center">Loading reviews...</div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Customer Reviews</h2>
          <p className="text-xl text-muted-foreground mb-4">
            See what our happy customers have to say
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="flex">{renderStars(Math.round(parseFloat(averageRating)))}</div>
            <span className="text-2xl font-bold">{averageRating}</span>
            <span className="text-muted-foreground">({reviews.length} reviews)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {reviews.map((review) => (
            <Card key={review.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Quote className="h-8 w-8 text-accent opacity-50 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">{renderStars(review.rating)}</div>
                    </div>
                    {review.title && (
                      <h4 className="font-semibold text-lg">{review.title}</h4>
                    )}
                  </div>
                </div>
                
                {review.comment && (
                  <p className="text-muted-foreground mb-4 line-clamp-4">
                    "{review.comment}"
                  </p>
                )}

                <div className="border-t pt-4">
                  <p className="font-medium">{review.bookings?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {review.bookings?.event_type && (
                      <span className="capitalize">{review.bookings.event_type}</span>
                    )}
                    {review.bookings?.venues?.name && (
                      <span> at {review.bookings.venues.name}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(review.created_at), "MMM yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
