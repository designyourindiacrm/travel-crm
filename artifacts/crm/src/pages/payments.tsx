import { useState } from "react";
import { Link } from "wouter";
import { useListPayments, getListPaymentsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Wallet, TrendingUp, Filter } from "lucide-react";

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"] as const;

export default function Payments() {
  const { data: payments, isLoading } = useListPayments({ query: { queryKey: getListPaymentsQueryKey() } });
  
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPayments = payments?.filter(payment => {
    const matchesMethod = methodFilter === "all" || payment.method === methodFilter;
    const matchesSearch = !searchQuery || 
      payment.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.bookingId.toString().includes(searchQuery);
    return matchesMethod && matchesSearch;
  }) || [];

  const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Payments Ledger</h1>
        <p className="text-muted-foreground mt-1">Track all incoming transactions across bookings.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">Total Collected (Filtered)</CardTitle>
            <Wallet className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalCollected.toLocaleString('en-IN')}</div>
            <p className="text-xs text-primary-foreground/80 mt-1">From {filteredPayments.length} transactions</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-lg border">
        <div className="flex items-center flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search notes or booking ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {PAYMENT_METHODS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction Date</TableHead>
              <TableHead>Booking Ref</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments found.</TableCell></TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{format(new Date(payment.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <Link href={`/bookings/${payment.bookingId}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                      BKG-{payment.bookingId.toString().padStart(4, '0')}
                    </Link>
                  </TableCell>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell><Badge variant="outline">{payment.type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{payment.notes || "-"}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}