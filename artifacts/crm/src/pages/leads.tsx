import { useState, useRef } from "react";
import {
  useListLeads,
  useCreateLead,
  useUpdateLead,
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
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LeadStatusBadge } from "@/components/status-badge";
import { WhatsappButton } from "@/components/whatsapp-button";
import { Plus, Search, Filter, Upload, FileSpreadsheet, Loader2 } from "lucide-react";

const LEAD_SOURCES = ["Instagram", "Facebook", "Website", "Manual", "Referral"] as const;
const LEAD_STATUSES = [
  "New", "Contacted", "Interested", "Quotation",
  "Follow-up", "Converted", "Lost", "Cold",
] as const;

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  city: z.string().optional(),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES).default("New"),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

export default function Leads() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Hidden file input for Excel upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useGetMe();
  const { data: users } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });

  const leadsParams = {
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(sourceFilter !== "all" && { source: sourceFilter }),
  };

  const { data: leads, isLoading } = useListLeads(leadsParams, {
    query: { queryKey: getListLeadsQueryKey(leadsParams) },
  });

  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", phone: "", city: "",
      source: "Manual", status: "New",
      assignedTo: "", notes: "",
    },
  });

  // ─── Create lead ─────────────────────────────────────────────────────────────
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createLead.mutate(
      {
        data: {
          ...values,
          assignedTo: values.assignedTo ? parseInt(values.assignedTo, 10) : null,
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

  // ─── Inline status change ──────────────────────────────────────────────────
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

  // ─── Excel upload ──────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    // Reset the input so the same file can be re-selected if needed
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
      const res = await fetch("/api/upload/excel", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json() as { imported: number; skipped: number; errors: string[] };

      if (!res.ok) {
        throw new Error((json as { error?: string }).error ?? "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });

      toast({
        title: `Import complete — ${json.imported} leads added`,
        description: json.skipped > 0
          ? `${json.skipped} rows were skipped. Check the console for details.`
          : undefined,
      });

      if (json.errors?.length) {
        console.warn("Excel import warnings:", json.errors);
      }
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

  // ─── Client-side search (name or phone) ───────────────────────────────────
  const filtered = leads?.filter((lead) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Hidden file input — triggered by the Import button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Leads</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your incoming inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Excel Import button */}
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            )}
            {isUploading ? "Importing…" : "Import Excel"}
          </Button>

          {/* Add Lead dialog */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>Create a new lead manually.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LEAD_SOURCES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="assignedTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign To</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {users?.map((u) => (
                                <SelectItem key={u.id} value={u.id.toString()}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createLead.isPending}>
                      {createLead.isPending ? "Creating…" : "Create Lead"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters + Search bar ── */}
      <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        {/* Name / phone search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name or phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source filter */}
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Result count */}
        {filtered !== undefined && (
          <Badge variant="secondary" className="ml-auto">
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* ── Excel import helper text ── */}
      <div className="flex items-start gap-2 rounded-md bg-muted/50 border border-dashed p-3 text-xs text-muted-foreground">
        <Upload className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          <strong>Excel Import:</strong> Upload a .xlsx file with columns:&nbsp;
          <code>name</code>, <code>phone</code>, <code>city</code>, <code>source</code>,&nbsp;
          <code>status</code>, <code>notes</code>. The first row must be the header.&nbsp;
          Source values: Instagram, Facebook, Website, Manual, Referral.
          &nbsp;Instagram leads also arrive automatically via webhook.
        </span>
      </div>

      {/* ── Leads table ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="border rounded-md bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No leads found.
                    {searchQuery && (
                      <button
                        className="ml-2 underline text-primary"
                        onClick={() => setSearchQuery("")}
                      >
                        Clear search
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      <Link href={`/leads/${lead.id}`} className="hover:underline text-primary">
                        {lead.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {lead.phone}
                    </TableCell>
                    <TableCell>{lead.city || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          lead.source === "Instagram"
                            ? "border-pink-400 text-pink-600"
                            : lead.source === "Facebook"
                              ? "border-blue-400 text-blue-600"
                              : "border-muted-foreground/30"
                        }
                      >
                        {lead.source}
                      </Badge>
                    </TableCell>

                    {/* ── Inline status dropdown ── */}
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={(val) => handleStatusChange(lead.id, val)}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>{lead.assignedToName || "Unassigned"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <WhatsappButton
                          phone={lead.phone}
                          message={`Hi ${lead.name}, this is ${currentUser?.name || "an agent"} from Design Your India regarding your trip enquiry.`}
                        />
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/leads/${lead.id}`}>View</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}
