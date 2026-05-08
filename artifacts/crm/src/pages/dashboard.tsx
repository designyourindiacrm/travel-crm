import {
  useGetDashboardSummary,
  useGetPipelineSummary,
  useGetSourceBreakdown,
  useGetRecentActivity,
  useGetTopDestinations,
  getGetDashboardSummaryQueryKey,
  getGetPipelineSummaryQueryKey,
  getGetSourceBreakdownQueryKey,
  getGetRecentActivityQueryKey,
  getGetTopDestinationsQueryKey
} from "@workspace/api-client-react";
import type {
  DashboardSummary,
  PipelineStage,
  SourceCount,
  RecentActivityItem,
  DestinationStat
} from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, IndianRupee, ArrowUpRight, TrendingUp, CalendarClock, Briefcase, WalletCards, ChartColumnBig } from "lucide-react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
};

const COLORS = [
  "hsl(224, 84%, 63%)",
  "hsl(222, 47%, 11%)",
  "hsl(160, 60%, 45%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 75%, 60%)"
];

const EMPTY_SUMMARY: DashboardSummary = {
  totalLeads: 0,
  newLeads: 0,
  convertedLeads: 0,
  conversionRate: 0,
  totalBookings: 0,
  totalRevenue: 0,
  totalCost: 0,
  totalProfit: 0,
  totalPaid: 0,
  outstandingBalance: 0,
  followUpsToday: 0,
  overdueFollowUps: 0
};

const statCards = [
  {
    key: "totalLeads",
    title: "Total Leads",
    helper: (summary: DashboardSummary) => `${summary.newLeads} new today`,
    value: (summary: DashboardSummary) => summary.totalLeads.toString(),
    icon: Users,
    accent: "text-primary"
  },
  {
    key: "conversionRate",
    title: "Conversion Rate",
    helper: (summary: DashboardSummary) => `${summary.convertedLeads} converted`,
    value: (summary: DashboardSummary) => `${summary.conversionRate.toFixed(1)}%`,
    icon: TrendingUp,
    accent: "text-sky-600"
  },
  {
    key: "revenue",
    title: "Revenue",
    helper: () => "Closed booking value",
    value: (summary: DashboardSummary) => formatCurrency(summary.totalRevenue),
    icon: IndianRupee,
    accent: "text-primary"
  },
  {
    key: "profit",
    title: "Profit",
    helper: () => "Net margin earned",
    value: (summary: DashboardSummary) => formatCurrency(summary.totalProfit),
    icon: ArrowUpRight,
    accent: "text-emerald-600"
  },
  {
    key: "outstanding",
    title: "Outstanding",
    helper: () => "Pending collection",
    value: (summary: DashboardSummary) => formatCurrency(summary.outstandingBalance),
    icon: WalletCards,
    accent: "text-orange-600"
  },
  {
    key: "followUpsToday",
    title: "Follow-ups",
    helper: (summary: DashboardSummary) => `${summary.overdueFollowUps} overdue`,
    value: (summary: DashboardSummary) => `${summary.followUpsToday} today`,
    icon: CalendarClock,
    accent: "text-rose-600"
  }
] as const;

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });

  const { data: pipeline, isLoading: loadingPipeline } = useGetPipelineSummary({
    query: { queryKey: getGetPipelineSummaryQueryKey() }
  });

  const { data: sources, isLoading: loadingSources } = useGetSourceBreakdown({
    query: { queryKey: getGetSourceBreakdownQueryKey() }
  });

  const { data: activities, isLoading: loadingActivities } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });

  const { data: destinations, isLoading: loadingDestinations } = useGetTopDestinations({
    query: { queryKey: getGetTopDestinationsQueryKey() }
  });

  if (loadingSummary || loadingPipeline || loadingSources || loadingActivities || loadingDestinations) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  const safeSummary: DashboardSummary = summary ?? EMPTY_SUMMARY;
  const safeSources: SourceCount[] = Array.isArray(sources) ? sources : [];
  const safePipeline: PipelineStage[] = Array.isArray(pipeline) ? pipeline : [];
  const safeActivities: RecentActivityItem[] = Array.isArray(activities) ? activities : [];
  const safeDestinations: DestinationStat[] = Array.isArray(destinations) ? destinations : [];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <motion.div className="space-y-6 pb-8" variants={containerVariants} initial="hidden" animate="show">
      <motion.div variants={itemVariants} className="rounded-3xl border border-primary/10 bg-linear-to-br from-white via-white to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 px-3 py-1 text-primary">Business snapshot</Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary">Overview</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Track bookings, revenue, pipeline progress, and follow-up pressure from one clean control surface.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-primary/10">
            <ChartColumnBig className="h-5 w-5 text-primary" />
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Bookings</div>
              <div className="text-lg font-semibold text-foreground">{safeSummary.totalBookings}</div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.key} variants={itemVariants}>
              <Card className="border-primary/10 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div>
                    <CardDescription>{card.title}</CardDescription>
                    <CardTitle className={`mt-2 text-3xl ${card.accent}`}>{card.value(safeSummary)}</CardTitle>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-3">
                    <Icon className={`h-5 w-5 ${card.accent}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.helper(safeSummary)}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <Card className="h-full border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle>Pipeline Breakdown</CardTitle>
              <CardDescription>Lead count by journey stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={safePipeline}>
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(224, 84%, 63%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-3">
          <Card className="h-full border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle>Lead Sources</CardTitle>
              <CardDescription>Where new inquiries are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={safeSources} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={68} outerRadius={108}>
                      {safeSources.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle>Top Destinations</CardTitle>
              <CardDescription>Highest revenue destinations right now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {safeDestinations.length === 0 ? (
                <div className="rounded-2xl bg-muted/30 px-4 py-6 text-sm text-muted-foreground">No destination data available yet.</div>
              ) : (
                safeDestinations.map((destination) => (
                  <div key={destination.destination} className="flex items-center justify-between rounded-2xl bg-muted/20 px-4 py-3">
                    <div>
                      <div className="font-medium text-foreground">{destination.destination}</div>
                      <div className="text-xs text-muted-foreground">{destination.bookings} bookings</div>
                    </div>
                    <div className="font-semibold text-primary">{formatCurrency(destination.revenue)}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-primary/10 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest visible team movement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {safeActivities.length === 0 ? (
                <div className="rounded-2xl bg-muted/30 px-4 py-6 text-sm text-muted-foreground">No recent activity available yet.</div>
              ) : (
                safeActivities.map((activity) => (
                  <div key={activity.id} className="rounded-2xl border border-border/70 bg-white px-4 py-3 shadow-sm">
                    <div className="font-medium text-foreground">{activity.leadName}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{activity.description}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
