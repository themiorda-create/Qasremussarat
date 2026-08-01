import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Calendar, Clock, Mail, Phone, User, Check, X, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import MeetingHistory from "./MeetingHistory";

interface Meeting {
  id: string;
  name: string;
  email: string;
  phone: string;
  requested_time: string;
  approved_time: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00"
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "approved":
      return <Badge className="bg-green-500">Approved</Badge>;
    case "rescheduled":
      return <Badge className="bg-blue-500">Rescheduled</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const MeetingsManager = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [newTime, setNewTime] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const { data: meetings, isLoading } = useQuery({
    queryKey: ["admin-meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Meeting[];
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      approved_time,
      admin_notes,
      oldStatus,
      oldTime,
    }: {
      id: string;
      status: string;
      approved_time?: string;
      admin_notes?: string;
      oldStatus?: string;
      oldTime?: string;
    }) => {
      const meeting = meetings?.find((m) => m.id === id);
      
      const { error } = await supabase
        .from("meetings")
        .update({ status, approved_time, admin_notes })
        .eq("id", id);

      if (error) throw error;

      // Log to meeting history
      await supabase.from("meeting_history").insert({
        meeting_id: id,
        changed_by: user?.id,
        change_type: status,
        old_time: oldTime || meeting?.requested_time,
        new_time: approved_time || meeting?.requested_time,
        old_status: oldStatus || meeting?.status,
        new_status: status,
        notes: admin_notes,
      });

      // Send notification email if rescheduled
      if (status === "rescheduled" && approved_time && meeting) {
        await supabase.functions.invoke("send-meeting-update", {
          body: {
            email: meeting.email,
            name: meeting.name,
            originalTime: meeting.requested_time,
            newTime: approved_time,
            status,
            adminNotes: admin_notes,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meeting-history"] });
      toast.success("Meeting updated successfully");
      setEditMeeting(null);
    },
    onError: (error) => {
      console.error("Error updating meeting:", error);
      toast.error("Failed to update meeting");
    },
  });

  const handleApprove = (meeting: Meeting) => {
    updateMeetingMutation.mutate({
      id: meeting.id,
      status: "approved",
      approved_time: meeting.requested_time,
      oldStatus: meeting.status,
      oldTime: meeting.requested_time,
    });
  };

  const handleReject = (meeting: Meeting) => {
    updateMeetingMutation.mutate({
      id: meeting.id,
      status: "rejected",
      oldStatus: meeting.status,
    });
  };

  const handleReschedule = () => {
    if (!editMeeting || !newDate || !newTime) {
      toast.error("Please select a new date and time");
      return;
    }

    const [hours, minutes] = newTime.split(":");
    const approvedTime = new Date(newDate);
    approvedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    updateMeetingMutation.mutate({
      id: editMeeting.id,
      status: "rescheduled",
      approved_time: approvedTime.toISOString(),
      admin_notes: adminNotes,
      oldStatus: editMeeting.status,
      oldTime: editMeeting.approved_time || editMeeting.requested_time,
    });
  };

  const openEditDialog = (meeting: Meeting) => {
    setEditMeeting(meeting);
    setNewDate(new Date(meeting.requested_time));
    setNewTime(format(new Date(meeting.requested_time), "HH:mm"));
    setAdminNotes(meeting.admin_notes || "");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meeting Requests</h2>
        <Badge variant="outline">
          {meetings?.filter((m) => m.status === "pending").length || 0} Pending
        </Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Requested Time</TableHead>
              <TableHead>Approved Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No meeting requests yet
                </TableCell>
              </TableRow>
            ) : (
              meetings?.map((meeting) => (
                <TableRow key={meeting.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        <User className="h-4 w-4" />
                        {meeting.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {meeting.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {meeting.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(meeting.requested_time), "PPP")}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(meeting.requested_time), "p")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {meeting.approved_time ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-500" />
                          {format(new Date(meeting.approved_time), "PPP")}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(meeting.approved_time), "p")}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(meeting.status)}</TableCell>
                  <TableCell>
                    {format(new Date(meeting.created_at), "PPP")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {meeting.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(meeting)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(meeting)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(meeting)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {meeting.status !== "pending" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(meeting)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editMeeting} onOpenChange={() => setEditMeeting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Customer: <strong>{editMeeting?.name}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Requested: {editMeeting && format(new Date(editMeeting.requested_time), "PPP 'at' p")}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">New Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {newDate ? format(newDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={newDate}
                    onSelect={setNewDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">New Time</label>
              <Select value={newTime} onValueChange={setNewTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message to Customer</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Let the customer know why you're rescheduling..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMeeting(null)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={updateMeetingMutation.isPending}>
              {updateMeetingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Send Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting History Section */}
      <MeetingHistory />
    </div>
  );
};

export default MeetingsManager;
