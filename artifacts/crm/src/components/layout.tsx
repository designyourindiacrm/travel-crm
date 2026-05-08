import { Link, useLocation } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { LayoutDashboard, Users, UserCircle, Briefcase, CreditCard, KanbanSquare, Settings, LogOut, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Pipeline", url: "/pipeline", icon: KanbanSquare },
  { title: "Follow-ups", url: "/follow-ups", icon: Briefcase },
  { title: "Bookings", url: "/bookings", icon: Building2 },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Team", url: "/team", icon: UserCircle },
];

function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });

  const handleLogout = () => {
    localStorage.removeItem("crm_token");
    window.location.href = "/login";
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r border-sidebar-border/80">
      <SidebarHeader className="border-b border-sidebar-border/80 px-4 py-5">
        <div className="flex items-center gap-3 overflow-hidden rounded-2xl bg-linear-to-r from-primary/6 via-primary/3 to-transparent p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-primary/10">
            <img src="/dyi-logo.png" alt="Design Your India" className="h-8 w-auto object-contain" />
          </div>
          <div className="grid min-w-0 flex-1 text-left leading-tight">
            <span className="truncate text-sm font-semibold tracking-tight text-primary">Design Your India</span>
            <span className="truncate text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Operations CRM</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url} className="h-10 rounded-xl px-3 text-sm font-medium">
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80 px-4 py-4">
        <div className="rounded-2xl bg-muted/40 p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm">
              {user?.name?.substring(0, 2).toUpperCase() || "U"}
            </div>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{user?.name}</span>
              <span className="truncate text-xs capitalize text-muted-foreground">{user?.role}</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <Link href="/settings">
                <Settings className="mr-2 size-4" />
                Settings
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl text-destructive hover:text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              Logout
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  }

  if (isError || !user) {
    window.location.href = "/login";
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[linear-gradient(180deg,rgba(89,125,240,0.04),transparent_160px)] text-foreground">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
            <SidebarTrigger className="sm:hidden" />
          </header>
          <main className="mx-auto w-full max-w-[1640px] flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
