import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, History, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MeetingHistoryRecord {
  id: string;
  meeting_id: string;
  change_type: string;
  old_time: string | null;
  new_time: string | null;
  old_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
  meetings: {
    name: string;
    email: string;
  } | null;
}

const getChangeBadge = (type: string) => {
  switch (type) {
    case "rescheduled":
      return <Badge className="bg-blue-500">Rescheduled</Badge>;
    case "approved":
      return <Badge className="bg-green-500">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "created":
      return <Badge variant="secondary">Created</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
};

const MeetingHistory = () => {
  const { data: history, isLoading } = useQuery({
    queryKey: ["meeting-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_history")
        .select(`
          *,
          meetings (name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MeetingHistoryRecord[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Meeting History</h3>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Change Type</TableHead>
              <TableHead>Time Change</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Changed On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No meeting history yet
                </TableCell>
              </TableRow>
            ) : (
              history?.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{record.meetings?.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{record.meetings?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getChangeBadge(record.change_type)}</TableCell>
                  <TableCell>
                    {record.old_time && record.new_time ? (
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(record.old_time), "MMM d, p")}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div className="flex items-center gap-1 text-green-600">
                          <Clock className="h-3 w-3" />
                          {format(new Date(record.new_time), "MMM d, p")}
                        </div>
                      </div>
                    ) : record.new_time ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {format(new Date(record.new_time), "MMM d, p")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {record.notes || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    {format(new Date(record.created_at), "MMM d, yyyy 'at' p")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MeetingHistory;
