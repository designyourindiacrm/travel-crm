import { useListUsers, getListUsersQueryKey, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldAlert, User, Mail, Calendar, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Team() {
  const { data: users, isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const { data: currentUser } = useGetMe();

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Team Directory</h1>
          <p className="text-muted-foreground mt-1">Manage agents and organizational access.</p>
        </div>
        
        {isAdmin && (
          <Button asChild>
            <Link href="/register"><UserPlus className="w-4 h-4 mr-2"/> Add User</Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading team...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {users?.map((user) => (
            <Card key={user.id} className={user.id === currentUser?.id ? "border-primary shadow-sm" : ""}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg leading-none">{user.name}</h3>
                      {user.id === currentUser?.id && (
                        <Badge variant="secondary" className="mt-1.5 font-normal text-xs">You</Badge>
                      )}
                    </div>
                  </div>
                  
                  {user.role === "admin" ? (
                    <div className="flex items-center text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200">
                      <ShieldAlert className="w-3 h-3 mr-1" />
                      Admin
                    </div>
                  ) : (
                    <div className="flex items-center text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-200">
                      <Shield className="w-3 h-3 mr-1" />
                      Agent
                    </div>
                  )}
                </div>
                
                <div className="mt-6 space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 mr-3 text-primary/60" />
                    {user.email}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-3 text-primary/60" />
                    Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}