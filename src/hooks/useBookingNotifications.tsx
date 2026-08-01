import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { RealtimePostgresUpdatePayload } from "@supabase/supabase-js";

interface Booking {
  id: string;
  name: string;
  email: string;
  status: string;
  user_id: string | null;
  event_date: string;
}

export const useBookingNotifications = (user: User | null) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) {
      // Clean up if user logs out
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Subscribe to booking updates for this user
    const channel = supabase
      .channel(`booking-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
        },
        (payload: RealtimePostgresUpdatePayload<Booking>) => {
          const newBooking = payload.new;
          const oldBooking = payload.old as Booking;

          // Only notify if this booking belongs to the current user (by user_id or email)
          const isUserBooking = 
            newBooking.user_id === user.id || 
            newBooking.email?.toLowerCase() === user.email?.toLowerCase();

          if (!isUserBooking) return;

          // Only notify if status changed
          if (oldBooking.status === newBooking.status) return;

          const statusMessages: Record<string, { title: string; description: string; type: 'success' | 'error' | 'info' }> = {
            confirmed: {
              title: "🎉 Booking Confirmed!",
              description: `Your booking for ${newBooking.event_date} has been confirmed.`,
              type: 'success',
            },
            cancelled: {
              title: "❌ Booking Cancelled",
              description: `Your booking for ${newBooking.event_date} has been cancelled.`,
              type: 'error',
            },
            completed: {
              title: "✅ Event Completed",
              description: `Your event on ${newBooking.event_date} has been marked as completed.`,
              type: 'info',
            },
            pending: {
              title: "⏳ Booking Pending",
              description: `Your booking for ${newBooking.event_date} is now pending review.`,
              type: 'info',
            },
          };

          const message = statusMessages[newBooking.status];
          if (message) {
            if (message.type === 'success') {
              toast.success(message.title, { description: message.description, duration: 8000 });
            } else if (message.type === 'error') {
              toast.error(message.title, { description: message.description, duration: 8000 });
            } else {
              toast.info(message.title, { description: message.description, duration: 8000 });
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);
};
