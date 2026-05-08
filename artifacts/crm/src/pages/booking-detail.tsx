import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetBooking,
  useListBookingPayments,
  useCreateBookingPayment,
  getGetBookingQueryKey,
  getListBookingPaymentsQueryKey,
  getListBookingsQueryKey
} from "@workspace/api-client-react";

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

import {
  Plane,
  Hotel,
  Users,
  CheckCircle2,
  Clock,
  Wallet,
  MapPin,
  IndianRupee,
  PieChart,
  Plus
} from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"] as const;
const PAYMENT_TYPES = ["Advance", "Partial", "Full"] as const;

const formSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  date: z.string().min(1),
  method: z.enum(PAYMENT_METHODS),
  type: z.enum(PAYMENT_TYPES),
  notes: z.string().optional(),
});

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const bookingId = Number(params?.id || 0);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: booking, isLoading: loadingBooking } = useGetBooking(bookingId, {
    query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bookingId) }
  });

  const { data: payments, isLoading: loadingPayments } = useListBookingPayments(bookingId, {
    query: { enabled: !!bookingId, queryKey: getListBookingPaymentsQueryKey(bookingId) }
  });

  const createPayment = useCreateBookingPayment();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      method: "Bank Transfer",
      type: "Partial",
      notes: ""
    }
  });

  if (loadingBooking) return <div className="p-8 text-center">Loading booking...</div>;
  if (!booking) return <div className="p-8 text-center">Booking not found</div>;

  const isSettled = (booking?.balance ?? 0) <= 0;

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createPayment.mutate(
      { id: bookingId, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetBookingQueryKey(bookingId) });
          queryClient.invalidateQueries({ queryKey: getListBookingPaymentsQueryKey(bookingId) });
          queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });

          toast({ title: "Payment recorded successfully" });

          setIsPaymentOpen(false);
          form.reset();
        },
        onError: (err: any) => {
          toast({
            variant: "destructive",
            title: "Payment failed",
            description: err.message
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">

      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">
          BKG-{String(booking.id).padStart(4, "0")}
        </h1>

        <Badge variant="outline">
          {isSettled ? "Settled" : "Pending"}
        </Badge>
      </div>

      {/* PAYMENT CARD */}
      <Card>
        <CardHeader className="flex justify-between">
          <CardTitle>Payments</CardTitle>

          {!isSettled && (
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Payment
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Payment</DialogTitle>
                  <DialogDescription>
                    Outstanding: ₹{booking.balance ?? 0}
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={createPayment.isPending}>
                      Save
                    </Button>

                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loadingPayments ? (
                <TableRow>
                  <TableCell colSpan={4}>Loading...</TableCell>
                </TableRow>
              ) : (payments?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>No payments</TableCell>
                </TableRow>
              ) : (
                payments?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.date ? format(new Date(p.date), "dd MMM yyyy") : "-"}
                    </TableCell>
                    <TableCell>{p.type}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>₹{p.amount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

          </Table>
        </CardContent>
      </Card>

    </div>
  );
}