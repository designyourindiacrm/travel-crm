import { useMemo, useRef, useState } from "react";
import {
  useListLeads,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  getListLeadsQueryKey,
  useListUsers,
  getListUsersQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LeadStatusBadge } from "@/components/status-badge";
import { WhatsappButton } from "@/components/whatsapp-button";
import {
  Plus,
  Search,
  Filter,
  Upload,
  FileSpreadsheet,
  Loader2,
  Download,
  Users,
  UserRoundX,
  Clock3,
  BadgeCheck,
  ChevronRight,
  Trash2,
} from "lucide-react";

const LEAD_SOURCES = ["Instagram", "Facebook", "Website", "Manual", "Referral"] as const;
const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Quotation",
  "Follow-up",
  "Converted",
  "Lost",
  "Cold",
] as const;

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  city: z.string().optional(),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES).default("New"),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

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

export default function Leads() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useGetMe();
  const { data: users } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const isAdmin = currentUser?.role === "admin";

  const leadsParams = {
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(sourceFilter !== "all" && { source: sourceFilter }),
  };

  const { data: leads, isLoading } = useListLeads(leadsParams, {
    query: { queryKey: getListLeadsQueryKey(leadsParams) },
  });

  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      city: "",
      source: "Manual",
      status: "New",
      assignedTo: "",
      notes: "",
    },
  });

  const filtered = useMemo(() => {
    return leads?.filter((lead) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return lead.name.toLowerCase().includes(q) || lead.phone.toLowerCase().includes(q);
    }) ?? [];
  }, [leads, searchQuery]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const unassigned = filtered.filter((lead) => !lead.assignedToName).length;
    const followUps = filtered.filter((lead) => lead.status === "Follow-up").length;
    const converted = filtered.filter((lead) => lead.status === "Converted").length;
    return { total, unassigned, followUps, converted };
  }, [filtered]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createLead.mutate(
      {
        data: {
          ...values,
          assignedTo: values.assignedTo && values.assignedTo !== "unassigned"
            ? parseInt(values.assignedTo, 10)
            : null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          toast({ title: "Lead created successfully" });
          setIsAddOpen(false);
          form.reset();
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "Failed to create lead",
            description: err.message,
          });
        },
      },
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem("crm_token");
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);

      const res = await fetch(`${API_BASE}/api/leads/export?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `leads_export_${today}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({ title: "Export downloaded successfully" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleStatusChange = (leadId: number, newStatus: string) => {
    updateLead.mutate(
      { id: leadId, data: { status: newStatus as typeof LEAD_STATUSES[number] } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          toast({ title: "Status updated" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to update status" });
        },
      },
    );
  };

  const handleDeleteLead = (leadId: number, leadName: string) => {
    if (!window.confirm(`Delete lead \"${leadName}\"? This cannot be undone.`)) return;

    deleteLead.mutate(
      { id: leadId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
          toast({ title: "Lead deleted" });
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Delete failed", description: error.message });
        },
      },
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = "";
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("crm_token");
      const res = await fetch(`${API_BASE}/api/upload/excel`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json() as { imported: number; skipped: number; errors: string[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      toast({
        title: `Import complete - ${json.imported} leads added`,
        description: json.skipped > 0 ? `${json.skipped} rows were skipped.` : undefined,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              Lead Management
            </Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary">Leads</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Track incoming inquiries, keep assignments tidy, and move every conversation through the pipeline with less clutter.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isExporting ? "Exporting..." : "Export Excel"}
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              {isUploading ? "Importing..." : "Import Excel"}
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>Create a new lead manually.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="source" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger></FormControl>
                            <SelectContent>{LEAD_SOURCES.map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="assignedTo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign To</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {users?.map((user) => <SelectItem key={user.id} value={user.id.toString()}>{user.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="submit" disabled={createLead.isPending}>{createLead.isPending ? "Creating..." : "Create Lead"}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/10 shadow-sm"><CardHeader className="pb-3"><CardDescription>Total leads in current view</CardDescription><CardTitle className="flex items-center justify-between text-3xl text-primary">{stats.total}<Users className="h-5 w-5 text-primary/70" /></CardTitle></CardHeader></Card>
        <Card className="border-orange-200 shadow-sm"><CardHeader className="pb-3"><CardDescription>Need assignment</CardDescription><CardTitle className="flex items-center justify-between text-3xl text-orange-600">{stats.unassigned}<UserRoundX className="h-5 w-5 text-orange-500" /></CardTitle></CardHeader></Card>
        <Card className="border-pink-200 shadow-sm"><CardHeader className="pb-3"><CardDescription>Follow-up stage</CardDescription><CardTitle className="flex items-center justify-between text-3xl text-pink-600">{stats.followUps}<Clock3 className="h-5 w-5 text-pink-500" /></CardTitle></CardHeader></Card>
        <Card className="border-emerald-200 shadow-sm"><CardHeader className="pb-3"><CardDescription>Converted customers</CardDescription><CardTitle className="flex items-center justify-between text-3xl text-emerald-600">{stats.converted}<BadgeCheck className="h-5 w-5 text-emerald-500" /></CardTitle></CardHeader></Card>
      </div>

      <Card className="overflow-hidden border-primary/10 shadow-sm">
        <CardHeader className="gap-4 border-b bg-muted/30 pb-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-xl">Lead Directory</CardTitle>
              <CardDescription>Search, filter, assign, export, update, and remove wrong entries from one place.</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit border-primary/20 bg-white px-3 py-1 text-primary">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</Badge>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 rounded-xl border-white bg-white pl-10 shadow-sm" placeholder="Search by lead name or phone" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-11 rounded-xl border-white bg-white shadow-sm"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="All Statuses" /></div></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{LEAD_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger className="h-11 rounded-xl border-white bg-white shadow-sm"><div className="flex items-center gap-2"><Upload className="h-4 w-4 text-muted-foreground" /><SelectValue placeholder="All Sources" /></div></SelectTrigger><SelectContent><SelectItem value="all">All Sources</SelectItem>{LEAD_SOURCES.map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}</SelectContent></Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="border-b bg-white/80 px-6 py-3 text-xs text-muted-foreground">Excel import supports columns: <code>name</code>, <code>phone</code>, <code>city</code>, <code>source</code>, <code>status</code>, <code>notes</code>.</div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6">Lead</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-14 text-center text-muted-foreground">No leads found for the current filters.</TableCell></TableRow>
                ) : (
                  filtered.map((lead) => (
                    <TableRow key={lead.id} className="border-b border-border/60 bg-white transition-colors hover:bg-primary/3">
                      <TableCell className="pl-6"><div className="space-y-1"><Link href={`/leads/${lead.id}`} className="font-semibold text-primary hover:underline">{lead.name}</Link><div className="text-sm text-muted-foreground">{lead.phone}</div><div className="text-xs text-muted-foreground">{lead.city || "No city added"}</div></div></TableCell>
                      <TableCell><Badge variant="outline" className={sourceBadgeClass(lead.source)}>{lead.source}</Badge></TableCell>
                      <TableCell><div className="space-y-2"><LeadStatusBadge status={lead.status} /><Select value={lead.status} onValueChange={(value) => handleStatusChange(lead.id, value)}><SelectTrigger className="h-8 w-[150px] rounded-lg bg-white text-xs shadow-none"><SelectValue /></SelectTrigger><SelectContent>{LEAD_STATUSES.map((status) => <SelectItem key={status} value={status} className="text-xs">{status}</SelectItem>)}</SelectContent></Select></div></TableCell>
                      <TableCell><div className="text-sm font-medium text-slate-700">{lead.assignedToName || "Unassigned"}</div></TableCell>
                      <TableCell><div className="text-sm text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</div></TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <WhatsappButton phone={lead.phone} message={`Hi ${lead.name}, this is ${currentUser?.name || "an agent"} from Design Your India regarding your trip enquiry.`} className="rounded-lg" />
                          <Button variant="outline" size="sm" asChild className="rounded-lg"><Link href={`/leads/${lead.id}`}>View<ChevronRight className="ml-1 h-4 w-4" /></Link></Button>
                          {isAdmin && (
                            <Button variant="outline" size="sm" className="rounded-lg text-destructive hover:text-destructive" onClick={() => handleDeleteLead(lead.id, lead.name)} disabled={deleteLead.isPending}>
                              <Trash2 className="h-4 w-4" />
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
        </CardContent>
      </Card>
    </div>
  );
}
