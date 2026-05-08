import { useListUsers, getListUsersQueryKey, useGetMe } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, Mail, Calendar, UserPlus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export default function Team() {
  const { data: users, isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const { data: currentUser } = useGetMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isAdmin = currentUser?.role === "admin";

  const handleDeleteUser = async (userId: number, name: string) => {
    if (!window.confirm(`Remove team member \"${name}\"? Their assigned leads will become unassigned.`)) return;

    try {
      const token = localStorage.getItem("crm_token");
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to remove user");
      }

      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "Team member removed" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Team Directory</h1>
          <p className="mt-1 text-muted-foreground">Manage agents, admins, and organizational access.</p>
        </div>

        {isAdmin && (
          <Button asChild>
            <Link href="/register"><UserPlus className="mr-2 h-4 w-4" /> Add User</Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading team...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {users?.map((user) => {
            const isSelf = user.id === currentUser?.id;
            return (
              <Card key={user.id} className={isSelf ? "border-primary shadow-sm" : "shadow-sm"}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border shadow-sm">
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold leading-none">{user.name}</h3>
                        {isSelf && <Badge variant="secondary" className="mt-1.5 text-xs font-normal">You</Badge>}
                      </div>
                    </div>

                    {user.role === "admin" ? (
                      <div className="flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
                        <ShieldAlert className="mr-1 h-3 w-3" />
                        Admin
                      </div>
                    ) : (
                      <div className="flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                        <Shield className="mr-1 h-3 w-3" />
                        Agent
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="mr-3 h-4 w-4 text-primary/60" />
                      {user.email}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-3 h-4 w-4 text-primary/60" />
                      Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>

                  {isAdmin && !isSelf && (
                    <div className="mt-6 border-t pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl text-destructive hover:text-destructive"
                        onClick={() => handleDeleteUser(user.id, user.name)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Member
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
