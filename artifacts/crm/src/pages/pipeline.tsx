import { useListLeads, useUpdateLead, getListLeadsQueryKey, getGetPipelineSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/status-badge";
import { Calendar, MapPin, Share2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const LEAD_STATUSES = ["New", "Contacted", "Interested", "Quotation", "Follow-up", "Converted", "Lost", "Cold"] as const;

export default function Pipeline() {
  const { data: leads, isLoading } = useListLeads({}, { query: { queryKey: getListLeadsQueryKey() } });
  const updateLead = useUpdateLead();
  const queryClient = useQueryClient();

  if (isLoading) {
    return <div className="p-8 text-center">Loading pipeline...</div>;
  }

  const groupedLeads = LEAD_STATUSES.reduce((acc, status) => {
    acc[status] = leads?.filter(l => l.status === status) || [];
    return acc;
  }, {} as Record<string, typeof leads>);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Pipeline</h1>
        <p className="text-muted-foreground mt-1">Visual overview of all active leads.</p>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max items-start">
          {LEAD_STATUSES.map((status) => {
            const columnLeads = groupedLeads[status] || [];
            
            return (
              <div key={status} className="w-80 flex flex-col h-full bg-muted/30 rounded-lg border border-border">
                <div className="p-3 border-b border-border bg-card flex justify-between items-center sticky top-0 rounded-t-lg">
                  <h3 className="font-semibold">{status}</h3>
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">{columnLeads.length}</span>
                </div>
                
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    <AnimatePresence>
                      {columnLeads.map((lead) => (
                        <motion.div
                          key={lead.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                        >
                          <Link href={`/leads/${lead.id}`}>
                            <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                              <CardContent className="p-3">
                                <div className="font-medium text-sm mb-2 text-primary">{lead.name}</div>
                                <div className="flex flex-col gap-1.5">
                                  {lead.city && (
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <MapPin className="w-3 h-3 mr-1" />
                                      {lead.city}
                                    </div>
                                  )}
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <Share2 className="w-3 h-3 mr-1" />
                                    {lead.source}
                                  </div>
                                  {lead.followUpDate && (
                                    <div className="flex items-center text-xs text-muted-foreground mt-1 font-medium text-amber-600">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {new Date(lead.followUpDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                      
                    {columnLeads.length === 0 && (
                      <div className="text-center p-4 text-sm text-muted-foreground italic border-2 border-dashed border-muted rounded-lg">
                        Empty
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}