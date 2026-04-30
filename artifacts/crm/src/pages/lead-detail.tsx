import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetLead, useUpdateLead, useListLeadActivities, useCreateLeadActivity, useListBookings, useListUsers, getGetLeadQueryKey, getListLeadActivitiesQueryKey, getListLeadsQueryKey, getListUsersQueryKey, getListBookingsQueryKey, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LeadStatusBadge } from "@/components/status-badge";
import { WhatsappButton } from "@/components/whatsapp-button";
import { Phone, Mail, MapPin, Calendar, Briefcase, Plus, MessageCircle, Info } from "lucide-react";

const LEAD_STATUSES = ["New", "Contacted", "Interested", "Quotation", "Follow-up", "Converted", "Lost", "Cold"] as const;
const ACTIVITY_TYPES = ["call", "note", "whatsapp", "email", "status_change"] as const;

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
  const leadBookings = allBookings?.filter(b => b.leadId === leadId) || [];

  const updateLead = useUpdateLead();
  const createActivity = useCreateLeadActivity();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const editForm = useForm({
    defaultValues: {
      status: lead?.status || "New",
      assignedTo: lead?.assignedTo?.toString() || "unassigned",
      followUpDate: lead?.followUpDate ? new Date(lead?.followUpDate).toISOString().slice(0, 16) : "",
      notes: lead?.notes || "",
    }
  });

  const activityForm = useForm({
    defaultValues: {
      type: "note" as const,
      description: "",
    }
  });

  if (loadingLead) return <div className="p-8 text-center">Loading lead details...</div>;
  if (!lead) return <div className="p-8 text-center">Lead not found.</div>;

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
    createActivity.mutate({
      id: leadId,
      data: values
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadActivitiesQueryKey(leadId) });
        toast({ title: "Activity logged successfully" });
        setIsActivityOpen(false);
        activityForm.reset();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-primary">{lead.name}</h1>
            <LeadStatusBadge status={lead.status} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center"><Phone className="w-4 h-4 mr-1" /> {lead.phone}</div>
            {lead.city && <div className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {lead.city}</div>}
            <div className="flex items-center"><Info className="w-4 h-4 mr-1" /> Source: {lead.source}</div>
            <div className="flex items-center"><Briefcase className="w-4 h-4 mr-1" /> Assignee: {lead.assignedToName || "Unassigned"}</div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <WhatsappButton 
            phone={lead.phone} 
            message={`Hi ${lead.name}, this is ${currentUser?.name || 'an agent'} from Design Your India regarding your trip enquiry.`} 
          />
          
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                editForm.reset({
                  status: lead.status,
                  assignedTo: lead.assignedTo?.toString() || "unassigned",
                  followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().slice(0, 16) : "",
                  notes: lead.notes || "",
                });
              }}>Edit Lead</Button>
            </DialogTrigger>
            <DialogContent>
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
                            {LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                            {users?.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
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
                        <FormControl><Textarea {...field} /></FormControl>
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

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="activities">
            <TabsList className="mb-4">
              <TabsTrigger value="activities">Activity Timeline</TabsTrigger>
              <TabsTrigger value="bookings">Bookings ({leadBookings.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activities" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Timeline</h3>
                <Dialog open={isActivityOpen} onOpenChange={setIsActivityOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> Log Activity</Button>
                  </DialogTrigger>
                  <DialogContent>
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
                                  {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
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
                              <FormControl><Textarea required {...field} placeholder="What happened?" /></FormControl>
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
                <div className="text-center py-4 text-muted-foreground">Loading activities...</div>
              ) : activities?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-card/50">No activities logged yet.</div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {activities?.map(activity => (
                    <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-background bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 text-primary">
                        {activity.type === 'call' ? <Phone className="w-4 h-4" /> :
                         activity.type === 'whatsapp' ? <MessageCircle className="w-4 h-4" /> :
                         activity.type === 'email' ? <Mail className="w-4 h-4" /> :
                         activity.type === 'status_change' ? <Info className="w-4 h-4" /> :
                         <Briefcase className="w-4 h-4" />}
                      </div>
                      <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="secondary" className="capitalize">{activity.type.replace('_', ' ')}</Badge>
                            <time className="text-xs text-muted-foreground font-medium">{format(new Date(activity.createdAt), 'MMM d, h:mm a')}</time>
                          </div>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{activity.description}</p>
                          {activity.userName && <p className="text-xs text-muted-foreground mt-2">— by {activity.userName}</p>}
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookings">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Associated Bookings</h3>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/bookings?new=true&leadId=1"><Plus className="w-4 h-4 mr-2" /> New Booking</Link>
                </Button>
              </div>
              
              {leadBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-card/50">No bookings created for this lead.</div>
              ) : (
                <div className="grid gap-4">
                  {leadBookings.map(booking => (
                    <Card key={booking.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <Link href={`/bookings/${booking.id}`} className="font-semibold text-primary hover:underline">{booking.packageName}</Link>
                          <div className="text-sm text-muted-foreground mt-1 flex gap-3">
                            <span className="flex items-center"><MapPin className="w-3 h-3 mr-1"/> {booking.destination}</span>
                            <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {format(new Date(booking.startDate), 'MMM d')} - {format(new Date(booking.endDate), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">₹{booking.salePrice.toLocaleString('en-IN')}</div>
                          <Badge variant={booking.balance <= 0 ? "default" : "destructive"} className="mt-1">
                            {booking.balance <= 0 ? "Paid" : `₹${booking.balance.toLocaleString('en-IN')} due`}
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

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Follow-up Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.followUpDate ? (
                <div className="text-center p-6 border rounded-lg bg-muted/30">
                  <Calendar className="w-8 h-8 mx-auto text-primary mb-3" />
                  <div className="font-semibold text-lg">{format(new Date(lead.followUpDate), 'MMMM d, yyyy')}</div>
                  <div className="text-muted-foreground">{format(new Date(lead.followUpDate), 'h:mm a')}</div>
                </div>
              ) : (
                <div className="text-center p-6 border rounded-lg border-dashed text-muted-foreground">
                  No follow-up scheduled.
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.notes ? (
                <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No notes available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}