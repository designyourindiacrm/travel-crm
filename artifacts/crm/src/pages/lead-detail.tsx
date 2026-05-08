import { useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetLead,
  useUpdateLead,
  useListLeadActivities,
  useCreateLeadActivity,
  useListBookings,
  useListUsers,
  getGetLeadQueryKey,
  getListLeadActivitiesQueryKey,
  getListLeadsQueryKey,
  getListUsersQueryKey,
  getListBookingsQueryKey,
  useGetMe
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LeadStatusBadge } from "@/components/status-badge";
import { WhatsappButton } from "@/components/whatsapp-button";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Plus,
  MessageCircle,
  Info,
  ChevronLeft,
  Clock3,
  UserRound,
  NotebookText,
  CircleDashed,
} from "lucide-react";

const LEAD_STATUSES = ["New", "Contacted", "Interested", "Quotation", "Follow-up", "Converted", "Lost", "Cold"] as const;
const ACTIVITY_TYPES = ["call", "note", "whatsapp", "email", "status_change"] as const;

const sourceBadgeClass = (source: string) => {
  switch (source) {
    case "Instagram":
      return "border-pink-300 bg-pink-50 text-pink-700";
    case "Facebook":
      return "border-blue-300 bg-blue-50 text-blue-700";
    case "Website":
      return "border-emerald-300 bg-emerald-50 text-emerald-700";
    case "Referral":
      return "border-amber-300 bg-amber-50 text-amber-700";
    default:
      return "border-slate-300 bg-slate-50 text-slate-700";
  }
};

export default function LeadDetail() {
  const [, params] = useRoute("/leads/:id");
  const leadId = parseInt(params?.id || "0", 10);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: currentUser } = useGetMe();

  const { data: lead, isLoading: loadingLead } = useGetLead(leadId, { query: { enabled: !!leadId, queryKey: getGetLeadQueryKey(leadId) } });
  const { data: activities, isLoading: loadingActivities } = useListLeadActivities(leadId, { query: { enabled: !!leadId, queryKey: getListLeadActivitiesQueryKey(leadId) } });
  const { data: users } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const { data: allBookings } = useListBookings({ query: { queryKey: getListBookingsQueryKey() } });

  const leadBookings = useMemo(() => allBookings?.filter((booking) => booking.leadId === leadId) || [], [allBookings, leadId]);

  const updateLead = useUpdateLead();
  const createActivity = useCreateLeadActivity();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const editForm = useForm({
    defaultValues: {
      status: lead?.status || "New",
      assignedTo: lead?.assignedTo?.toString() || "unassigned",
      followUpDate: lead?.followUpDate ? new Date(lead.followUpDate).toISOString().slice(0, 16) : "",
      notes: lead?.notes || "",
    }
  });

  const activityForm = useForm({
    defaultValues: {
      type: "note" as const,
      description: "",
    }
  });

  if (loadingLead) return <div className="p-8 text-center text-muted-foreground">Loading lead details...</div>;
  if (!lead) return <div className="p-8 text-center text-muted-foreground">Lead not found.</div>;

  const onEditSubmit = (values: any) => {
    updateLead.mutate({
      id: leadId,
      data: {
        status: values.status,
        assignedTo: values.assignedTo === "unassigned" ? null : parseInt(values.assignedTo, 10),
        followUpDate: values.followUpDate ? new Date(values.followUpDate).toISOString() : null,
        notes: values.notes,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListLeadActivitiesQueryKey(leadId) });
        toast({ title: "Lead updated successfully" });
        setIsEditOpen(false);
      }
    });
  };

  const onActivitySubmit = (values: any) => {
    createActivity.mutate({ id: leadId, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadActivitiesQueryKey(leadId) });
        toast({ title: "Activity logged successfully" });
        setIsActivityOpen(false);
        activityForm.reset();
      }
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild className="rounded-xl">
          <Link href="/leads">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Link>
        </Button>
      </div>

      <div className="rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-primary">{lead.name}</h1>
              <LeadStatusBadge status={lead.status} />
              <Badge variant="outline" className={sourceBadgeClass(lead.source)}>{lead.source}</Badge>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-primary/8">
                <Phone className="h-4 w-4 text-primary" />
                <span>{lead.phone}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-primary/8">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{lead.city || "No city added"}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-primary/8">
                <UserRound className="h-4 w-4 text-primary" />
                <span>{lead.assignedToName || "Unassigned"}</span>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-primary/8">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{format(new Date(lead.createdAt), "dd MMM yyyy")}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <WhatsappButton
              phone={lead.phone}
              message={`Hi ${lead.name}, this is ${currentUser?.name || "an agent"} from Design Your India regarding your trip enquiry.`}
              className="rounded-xl"
            />

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl" onClick={() => {
                  editForm.reset({
                    status: lead.status,
                    assignedTo: lead.assignedTo?.toString() || "unassigned",
                    followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().slice(0, 16) : "",
                    notes: lead.notes || "",
                  });
                }}>
                  Edit Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>Edit Lead Details</DialogTitle>
                </DialogHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {LEAD_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="assignedTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign To</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {users?.map((user) => <SelectItem key={user.id} value={user.id.toString()}>{user.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="followUpDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow-up Date & Time</FormLabel>
                          <FormControl><Input type="datetime-local" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl><Textarea {...field} className="min-h-28" /></FormControl>
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={updateLead.isPending}>Save Changes</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-xl text-foreground">{lead.status}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Bookings</CardDescription>
            <CardTitle className="text-xl text-foreground">{leadBookings.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Activities</CardDescription>
            <CardTitle className="text-xl text-foreground">{activities?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Follow-up</CardDescription>
            <CardTitle className="text-base text-foreground">{lead.followUpDate ? format(new Date(lead.followUpDate), "dd MMM, h:mm a") : "Not scheduled"}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Tabs defaultValue="activities" className="space-y-4">
            <TabsList className="rounded-2xl bg-muted/40 p-1">
              <TabsTrigger value="activities" className="rounded-xl">Activity Timeline</TabsTrigger>
              <TabsTrigger value="bookings" className="rounded-xl">Bookings ({leadBookings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Timeline</h3>
                  <p className="text-sm text-muted-foreground">Track calls, notes, status changes, and WhatsApp updates.</p>
                </div>
                <Dialog open={isActivityOpen} onOpenChange={setIsActivityOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <Plus className="mr-2 h-4 w-4" />
                      Log Activity
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                      <DialogTitle>Log Activity</DialogTitle>
                    </DialogHeader>
                    <Form {...activityForm}>
                      <form onSubmit={activityForm.handleSubmit(onActivitySubmit)} className="space-y-4">
                        <FormField
                          control={activityForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Activity Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {ACTIVITY_TYPES.map((type) => <SelectItem key={type} value={type} className="capitalize">{type.replace("_", " ")}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={activityForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl><Textarea required {...field} className="min-h-28" placeholder="What happened?" /></FormControl>
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createActivity.isPending}>Log Activity</Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {loadingActivities ? (
                <div className="rounded-3xl border bg-card px-6 py-10 text-center text-muted-foreground">Loading activities...</div>
              ) : activities?.length === 0 ? (
                <div className="rounded-3xl border bg-card px-6 py-12 text-center text-muted-foreground">
                  <CircleDashed className="mx-auto mb-3 h-6 w-6 text-primary/50" />
                  No activities logged yet.
                </div>
              ) : (
                <div className="relative space-y-4 before:absolute before:bottom-0 before:left-5 before:top-0 before:w-px before:bg-border">
                  {activities?.map((activity) => (
                    <div key={activity.id} className="relative flex gap-4 pl-14">
                      <div className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/10 bg-white text-primary shadow-sm">
                        {activity.type === "call" ? <Phone className="h-4 w-4" /> :
                          activity.type === "whatsapp" ? <MessageCircle className="h-4 w-4" /> :
                          activity.type === "email" ? <Mail className="h-4 w-4" /> :
                          activity.type === "status_change" ? <Info className="h-4 w-4" /> :
                          <NotebookText className="h-4 w-4" />}
                      </div>
                      <Card className="w-full border-primary/10 shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge variant="secondary" className="capitalize">{activity.type.replace("_", " ")}</Badge>
                            <time className="text-xs font-medium text-muted-foreground">{format(new Date(activity.createdAt), "MMM d, h:mm a")}</time>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{activity.description}</p>
                          {activity.userName && <p className="mt-3 text-xs text-muted-foreground">by {activity.userName}</p>}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Associated Bookings</h3>
                  <p className="text-sm text-muted-foreground">Trips and packages already converted from this lead.</p>
                </div>
                <Button variant="outline" size="sm" asChild className="rounded-xl">
                  <Link href="/bookings?new=true&leadId=1">
                    <Plus className="mr-2 h-4 w-4" />
                    New Booking
                  </Link>
                </Button>
              </div>

              {leadBookings.length === 0 ? (
                <div className="rounded-3xl border bg-card px-6 py-12 text-center text-muted-foreground">No bookings created for this lead.</div>
              ) : (
                <div className="grid gap-4">
                  {leadBookings.map((booking) => (
                    <Card key={booking.id} className="border-primary/10 shadow-sm transition-colors hover:border-primary/30">
                      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <Link href={`/bookings/${booking.id}`} className="font-semibold text-primary hover:underline">{booking.packageName}</Link>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center"><MapPin className="mr-1 h-3.5 w-3.5" /> {booking.destination}</span>
                            <span className="flex items-center"><Calendar className="mr-1 h-3.5 w-3.5" /> {format(new Date(booking.startDate), "MMM d")} - {format(new Date(booking.endDate), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="font-bold text-emerald-600">Rs {booking.salePrice.toLocaleString("en-IN")}</div>
                          <Badge variant={booking.balance <= 0 ? "default" : "destructive"} className="mt-2">
                            {booking.balance <= 0 ? "Paid" : `Rs ${booking.balance.toLocaleString("en-IN")} due`}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="h-4 w-4 text-primary" />
                Follow-up Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.followUpDate ? (
                <div className="rounded-3xl border border-primary/10 bg-primary/4 p-6 text-center">
                  <Calendar className="mx-auto mb-3 h-8 w-8 text-primary" />
                  <div className="text-lg font-semibold">{format(new Date(lead.followUpDate), "MMMM d, yyyy")}</div>
                  <div className="text-sm text-muted-foreground">{format(new Date(lead.followUpDate), "h:mm a")}</div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">No follow-up scheduled.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <NotebookText className="h-4 w-4 text-primary" />
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.notes ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{lead.notes}</p>
              ) : (
                <p className="text-sm italic text-muted-foreground">No notes available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
