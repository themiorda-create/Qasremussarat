import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Clock, History, ArrowRight, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MeetingWithHistory {
  id: string;
  name: string;
  email: string;
  requested_time: string;
  approved_time: string | null;
  status: string;
  created_at: string;
  meeting_history: {
    id: string;
    change_type: string;
    old_time: string | null;
    new_time: string | null;
    old_status: string | null;
    new_status: string | null;
    notes: string | null;
    created_at: string;
  }[];
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return <Badge className="bg-green-500">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "rescheduled":
      return <Badge className="bg-blue-500">Rescheduled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getChangeBadge = (type: string) => {
  switch (type) {
    case "rescheduled":
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Rescheduled</Badge>;
    case "approved":
      return <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>;
    case "created":
      return <Badge variant="outline">Created</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
};

const CustomerMeetingHistory = () => {
  const { user } = useAuth();

  const { data: meetings, isLoading } = useQuery({
    queryKey: ["customer-meetings-with-history", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("meetings")
        .select(`
          *,
          meeting_history (
            id,
            change_type,
            old_time,
            new_time,
            old_status,
            new_status,
            notes,
            created_at
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MeetingWithHistory[];
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Your Meeting History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Please log in to view your meeting history.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="mt-8">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!meetings || meetings.length === 0) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Your Meeting History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No meeting requests yet. Book your first meeting above!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Your Meeting History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div key={meeting.id} className="border rounded-lg p-4 space-y-3">
                {/* Meeting Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(new Date(meeting.requested_time), "PPP")}
                      </span>
                      <span className="text-muted-foreground">at</span>
                      <span className="font-medium">
                        {format(new Date(meeting.requested_time), "p")}
                      </span>
                    </div>
                    {meeting.approved_time && meeting.approved_time !== meeting.requested_time && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Clock className="h-3 w-3" />
                        <span>Confirmed for: {format(new Date(meeting.approved_time), "PPP 'at' p")}</span>
                      </div>
                    )}
                  </div>
                  {getStatusBadge(meeting.status)}
                </div>

                {/* History Timeline */}
                {meeting.meeting_history && meeting.meeting_history.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Activity</p>
                    <div className="space-y-2">
                      {meeting.meeting_history
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((history) => (
                          <div
                            key={history.id}
                            className="flex items-start gap-3 text-sm bg-muted/50 rounded-md p-2"
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {getChangeBadge(history.change_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              {history.old_time && history.new_time ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-muted-foreground line-through">
                                    {format(new Date(history.old_time), "MMM d, p")}
                                  </span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-green-600 font-medium">
                                    {format(new Date(history.new_time), "MMM d, p")}
                                  </span>
                                </div>
                              ) : history.new_time ? (
                                <span>
                                  Scheduled for {format(new Date(history.new_time), "MMM d, p")}
                                </span>
                              ) : null}
                              {history.notes && (
                                <p className="text-muted-foreground mt-1 truncate">
                                  {history.notes}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(history.created_at), "MMM d, yyyy 'at' p")}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CustomerMeetingHistory;
