import { Link, useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Building2, LayoutDashboard, Users, UserCircle, Briefcase, CreditCard, KanbanSquare, Settings, LogOut, Menu } from "lucide-react";
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
  useSidebar
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
  const { data: user } = useGetMe({ query: { retry: false } });

  const handleLogout = () => {
    localStorage.removeItem("crm_token");
    window.location.href = "/login";
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2 px-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold tracking-tight text-primary">VOYAGER</span>
            <span className="truncate text-xs text-muted-foreground uppercase tracking-widest">Travels</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
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
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-semibold text-xs">
              {user?.name?.substring(0, 2).toUpperCase() || "U"}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user?.name}</span>
              <span className="truncate text-xs text-muted-foreground capitalize">{user?.role}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link href="/settings">
              <Settings className="size-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="size-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      retry: false,
    }
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-background">Loading...</div>;
  }

  if (isError || !user) {
    window.location.href = "/login";
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col w-full min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6 md:h-16">
            <SidebarTrigger className="sm:hidden" />
          </header>
          <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-[1600px] mx-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}