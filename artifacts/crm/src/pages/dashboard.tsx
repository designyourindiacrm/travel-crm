import { useGetDashboardSummary, useGetPipelineSummary, useGetSourceBreakdown, useGetRecentActivity, useGetTopDestinations, getGetDashboardSummaryQueryKey, getGetPipelineSummaryQueryKey, getGetSourceBreakdownQueryKey, getGetRecentActivityQueryKey, getGetTopDestinationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, IndianRupee, ArrowUpRight, TrendingUp, CalendarClock, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

const COLORS = ['hsl(220, 70%, 25%)', 'hsl(42, 75%, 52%)', 'hsl(160, 60%, 45%)', 'hsl(280, 65%, 60%)', 'hsl(340, 75%, 55%)'];

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: pipeline, isLoading: loadingPipeline } = useGetPipelineSummary({ query: { queryKey: getGetPipelineSummaryQueryKey() } });
  const { data: sources, isLoading: loadingSources } = useGetSourceBreakdown({ query: { queryKey: getGetSourceBreakdownQueryKey() } });
  const { data: activities, isLoading: loadingActivities } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const { data: destinations, isLoading: loadingDestinations } = useGetTopDestinations({ query: { queryKey: getGetTopDestinationsQueryKey() } });

  if (loadingSummary || loadingPipeline || loadingSources || loadingActivities || loadingDestinations) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Overview</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalLeads || 0}</div>
              <p className="text-xs text-muted-foreground">
                {summary?.newLeads || 0} new
              </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {summary?.convertedLeads} converted
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(summary?.totalRevenue || 0)}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalProfit || 0)}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Briefcase className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary?.outstandingBalance || 0)}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follow-ups</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.followUpsToday || 0} today</div>
              <p className="text-xs text-destructive font-medium">
                {summary?.overdueFollowUps || 0} overdue
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <motion.div variants={itemVariants} className="col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Pipeline Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipeline || []}>
                    <XAxis dataKey="status" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants} className="col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Lead Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sources || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="source"
                    >
                      {sources?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Top Destinations</CardTitle>
              <CardDescription>By revenue generated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {destinations?.map((dest) => (
                  <div key={dest.destination} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{dest.destination}</span>
                      <span className="text-xs text-muted-foreground">{dest.bookings} bookings</span>
                    </div>
                    <div className="font-medium text-sm">{formatCurrency(dest.revenue)}</div>
                  </div>
                ))}
                {(!destinations || destinations.length === 0) && (
                  <div className="text-sm text-muted-foreground text-center py-4">No data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates across the team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities?.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="mt-1 bg-secondary/20 p-2 rounded-full">
                      <Briefcase className="size-4 text-primary" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{activity.leadName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{activity.description}</span>
                    </div>
                  </div>
                ))}
                {(!activities || activities.length === 0) && (
                  <div className="text-sm text-muted-foreground text-center py-4">No recent activity</div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}