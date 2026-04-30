import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetBooking, useListBookingPayments, useCreateBookingPayment, getGetBookingQueryKey, getListBookingPaymentsQueryKey, getListBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter as DialogFooterUI, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plane, Hotel, Car, Users, CheckCircle2, Clock, Wallet, MapPin, IndianRupee, PieChart } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"] as const;
const PAYMENT_TYPES = ["Advance", "Partial", "Full"] as const;

const formSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  method: z.enum(PAYMENT_METHODS),
  type: z.enum(PAYMENT_TYPES),
  notes: z.string().optional(),
});

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const bookingId = parseInt(params?.id || "0", 10);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: booking, isLoading: loadingBooking } = useGetBooking(bookingId, { query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) } });
  const { data: payments, isLoading: loadingPayments } = useListBookingPayments(bookingId, { query: { enabled: !!bookingId, queryKey: getListBookingPaymentsQueryKey(bookingId) } });
  const createPayment = useCreateBookingPayment();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      method: "Bank Transfer",
      type: "Partial",
      notes: "",
    },
  });

  if (loadingBooking) return <div className="p-8 text-center">Loading booking details...</div>;
  if (!booking) return <div className="p-8 text-center">Booking not found.</div>;

  const isSettled = booking.balance <= 0;

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createPayment.mutate({
      id: bookingId,
      data: values
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
        queryClient.invalidateQueries({ queryKey: getListBookingPaymentsQueryKey(bookingId) });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        toast({ title: "Payment recorded successfully" });
        setIsPaymentOpen(false);
        form.reset();
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to record payment", description: err.message });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-primary">BKG-{booking.id.toString().padStart(4, '0')}</h1>
            {isSettled ? (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Settled</Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-lg">
            {booking.packageName} for <Link href={`/leads/${booking.leadId}`} className="text-primary hover:underline font-medium">{booking.leadName}</Link>
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-lg flex items-center"><MapPin className="w-5 h-5 mr-2 text-primary" /> Itinerary Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid sm:grid-cols-2 gap-y-6 gap-x-12">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Destination</p>
                <p className="font-medium text-lg">{booking.destination}</p>
                <p className="text-sm text-muted-foreground">{booking.tripType}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Travel Dates</p>
                <p className="font-medium text-lg">
                  {format(new Date(booking.startDate), 'dd MMM yyyy')} — {format(new Date(booking.endDate), 'dd MMM yyyy')}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1"><Users className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Passengers</p>
                  <p className="font-medium">{booking.totalPersons} Total</p>
                  <p className="text-sm text-muted-foreground">{booking.adults} Adults, {booking.children} Children, {booking.infants} Infants</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1"><Hotel className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Accommodation</p>
                  <p className="font-medium">{booking.packageServiceType}</p>
                  {booking.hotelType && <p className="text-sm text-muted-foreground">{booking.hotelType} Category • {booking.mealPlan} Plan</p>}
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1"><Plane className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Travel Mode</p>
                  <p className="font-medium">{booking.travelMode}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b flex flex-row items-center justify-between bg-muted/10">
              <CardTitle className="text-lg flex items-center"><Wallet className="w-5 h-5 mr-2 text-primary" /> Payment History</CardTitle>
              {!isSettled && (
                <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Add Payment</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Payment</DialogTitle>
                      <DialogDescription>Log a payment received for this booking. Outstanding balance: ₹{booking.balance.toLocaleString('en-IN')}</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="amount" render={({ field }) => (
                          <FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          
                          <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control} name="method" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>{PAYMENT_METHODS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem><FormLabel>Notes/Reference</FormLabel><FormControl><Textarea {...field} placeholder="Transaction ID, cheque number, etc." /></FormControl></FormItem>
                        )} />
                        
                        <DialogFooterUI>
                          <Button type="submit" disabled={createPayment.isPending}>Record Payment</Button>
                        </DialogFooterUI>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPayments ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-4">Loading...</TableCell></TableRow>
                  ) : payments?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payments recorded yet.</TableCell></TableRow>
                  ) : (
                    payments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{format(new Date(payment.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell><Badge variant="secondary">{payment.type}</Badge></TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={payment.notes || ""}>{payment.notes || "-"}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-24 shadow-md border-primary/20">
            <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
              <CardTitle className="text-lg flex items-center"><PieChart className="w-5 h-5 mr-2 text-primary" /> Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Selling Price</span>
                  <span className="font-medium text-base">₹{booking.salePrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Net Cost</span>
                  <span className="font-medium">₹{booking.costPrice.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between items-center">
                  <span className="font-semibold text-primary">Profit Margin</span>
                  <span className="font-bold text-green-600">₹{booking.profit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 bg-muted/20 border-t p-6">
              <div className="w-full space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Received</span>
                  <span className="font-medium text-green-600">₹{booking.paid.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(0, (booking.paid / booking.salePrice) * 100))}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-end pt-2">
                  <span className="text-sm font-medium">Outstanding</span>
                  <span className={`text-2xl font-bold ${isSettled ? 'text-green-600' : 'text-destructive'}`}>
                    ₹{booking.balance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}