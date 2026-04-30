import { useListPendingFollowups, getListPendingFollowupsQueryKey, useGetMe } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeadStatusBadge } from "@/components/status-badge";
import { WhatsappButton } from "@/components/whatsapp-button";
import { CalendarClock, AlertCircle } from "lucide-react";
import { isBefore, isToday, parseISO, startOfDay } from "date-fns";

export default function FollowUps() {
  const { data: followups, isLoading } = useListPendingFollowups({ query: { queryKey: getListPendingFollowupsQueryKey() } });
  const { data: currentUser } = useGetMe();

  if (isLoading) return <div className="p-8 text-center">Loading follow-ups...</div>;

  const today = startOfDay(new Date());

  const overdue = followups?.filter(f => f.followUpDate && isBefore(startOfDay(parseISO(f.followUpDate)), today)) || [];
  const dueToday = followups?.filter(f => f.followUpDate && isToday(parseISO(f.followUpDate))) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Follow-ups</h1>
        <p className="text-muted-foreground mt-1">Pending and overdue lead follow-ups.</p>
      </div>

      <div className="space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Overdue ({overdue.length})</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {overdue.length === 0 ? (
              <div className="col-span-full text-muted-foreground p-8 text-center border rounded-lg bg-card/50">
                No overdue follow-ups. Great job!
              </div>
            ) : (
              overdue.map(lead => (
                <FollowUpCard key={lead.id} lead={lead} userName={currentUser?.name} />
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4 mt-8">
            <CalendarClock className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Today ({dueToday.length})</h2>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dueToday.length === 0 ? (
              <div className="col-span-full text-muted-foreground p-8 text-center border rounded-lg bg-card/50">
                No follow-ups scheduled for today.
              </div>
            ) : (
              dueToday.map(lead => (
                <FollowUpCard key={lead.id} lead={lead} userName={currentUser?.name} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function FollowUpCard({ lead, userName }: { lead: any, userName?: string }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            <Link href={`/leads/${lead.id}`} className="hover:underline text-primary">
              {lead.name}
            </Link>
          </CardTitle>
          <LeadStatusBadge status={lead.status} />
        </div>
        <CardDescription>
          Due: {new Date(lead.followUpDate).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lead.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {lead.notes}
          </p>
        )}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <WhatsappButton 
            phone={lead.phone} 
            message={`Hi ${lead.name}, this is ${userName || 'an agent'} from Voyager Travels following up on your trip.`}
            className="flex-1"
          />
          <Button variant="outline" className="flex-1" asChild>
            <Link href={`/leads/${lead.id}`}>Open Lead</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}