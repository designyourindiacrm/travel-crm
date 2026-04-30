import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useListBookings, useCreateBooking, useListLeads, getListBookingsQueryKey, getListLeadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const TRIP_TYPES = ["Domestic", "International"] as const;
const TRAVEL_MODES = ["Self", "Volvo", "Train", "Flight"] as const;
const PACKAGE_TYPES = ["Hotel Only", "Hotel + Cab", "Complete Package"] as const;
const HOTEL_TYPES = ["3*", "4*", "5*"] as const;
const MEAL_PLANS = ["CP", "MAP", "AP"] as const;

const formSchema = z.object({
  leadId: z.string().min(1, "Lead is required"),
  packageName: z.string().min(1, "Package name is required"),
  destination: z.string().min(1, "Destination is required"),
  tripType: z.enum(TRIP_TYPES),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  adults: z.coerce.number().min(1),
  children: z.coerce.number().min(0),
  infants: z.coerce.number().min(0),
  travelMode: z.enum(TRAVEL_MODES),
  packageServiceType: z.enum(PACKAGE_TYPES),
  hotelType: z.enum(HOTEL_TYPES).optional(),
  mealPlan: z.enum(MEAL_PLANS).optional(),
  costPrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
});

export default function Bookings() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialOpen = params.get("new") === "true";
  
  const [isOpen, setIsOpen] = useState(initialOpen);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bookings, isLoading } = useListBookings({ query: { queryKey: getListBookingsQueryKey() } });
  const { data: leads } = useListLeads({ status: "Converted" }, { query: { queryKey: getListLeadsQueryKey({ status: "Converted" }) } });
  const createBooking = useCreateBooking();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leadId: "",
      packageName: "",
      destination: "",
      tripType: "Domestic",
      startDate: "",
      endDate: "",
      adults: 2,
      children: 0,
      infants: 0,
      travelMode: "Flight",
      packageServiceType: "Complete Package",
      hotelType: "4*",
      mealPlan: "MAP",
      costPrice: 0,
      salePrice: 0,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createBooking.mutate({
      data: {
        ...values,
        leadId: parseInt(values.leadId, 10),
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        toast({ title: "Booking created successfully" });
        setIsOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to create booking", description: err.message });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Bookings</h1>
          <p className="text-muted-foreground mt-1">Manage finalized trips and itineraries.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
              <DialogDescription>Enter trip details for a converted lead.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Client / Lead</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a converted lead" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {leads?.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name} ({l.phone})</SelectItem>)}
                            {(!leads || leads.length === 0) && <SelectItem value="none" disabled>No converted leads available</SelectItem>}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField control={form.control} name="packageName" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Package Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  
                  <FormField control={form.control} name="destination" render={({ field }) => (
                    <FormItem><FormLabel>Destination</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  
                  <FormField control={form.control} name="tripType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{TRIP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  
                  <FormField control={form.control} name="endDate" render={({ field }) => (
                    <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <div className="col-span-2 grid grid-cols-3 gap-4 border p-4 rounded-lg bg-muted/20">
                    <FormField control={form.control} name="adults" render={({ field }) => (
                      <FormItem><FormLabel>Adults</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="children" render={({ field }) => (
                      <FormItem><FormLabel>Children</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="infants" render={({ field }) => (
                      <FormItem><FormLabel>Infants</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="packageServiceType" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Service Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{PACKAGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="travelMode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel Mode</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{TRAVEL_MODES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="hotelType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{HOTEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="mealPlan" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Plan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{MEAL_PLANS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="col-span-2 grid grid-cols-2 gap-4 border p-4 rounded-lg bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                    <FormField control={form.control} name="salePrice" render={({ field }) => (
                      <FormItem><FormLabel>Selling Price (₹)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="costPrice" render={({ field }) => (
                      <FormItem><FormLabel>Net Cost (₹)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                <DialogFooter className="pt-4 border-t mt-4">
                  <Button type="submit" disabled={createBooking.isPending} className="w-full sm:w-auto">
                    {createBooking.isPending ? "Creating..." : "Confirm Booking"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Package / Destination</TableHead>
              <TableHead>Travel Dates</TableHead>
              <TableHead>Pax</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : bookings?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No bookings found.</TableCell></TableRow>
            ) : (
              bookings?.map((booking) => (
                <TableRow key={booking.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Link href={`/bookings/${booking.id}`} className="hover:underline text-primary">
                      BKG-{booking.id.toString().padStart(4, '0')}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/leads/${booking.leadId}`} className="hover:underline">
                      {booking.leadName || "Unknown"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-primary line-clamp-1">{booking.packageName}</div>
                    <div className="text-xs text-muted-foreground">{booking.destination} • {booking.tripType}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{format(new Date(booking.startDate), 'MMM d')} - {format(new Date(booking.endDate), 'MMM d, yyyy')}</div>
                  </TableCell>
                  <TableCell>
                    {booking.totalPersons} <span className="text-xs text-muted-foreground">({booking.adults}A, {booking.children}C)</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{booking.salePrice.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={booking.balance <= 0 ? "secondary" : "destructive"}>
                      {booking.balance <= 0 ? "Settled" : `₹${booking.balance.toLocaleString('en-IN')}`}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}