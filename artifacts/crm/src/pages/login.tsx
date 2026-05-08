import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        localStorage.setItem("crm_token", data.token);
        toast({ title: "Welcome back", description: "Logged in successfully." });
        setLocation("/");
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message || "Please check your credentials and try again.",
        });
      },
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(89,125,240,0.22),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] px-4 py-10">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.4)_45%,transparent_100%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white/88 shadow-[0_30px_80px_rgba(34,53,117,0.14)] backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden flex-col justify-between bg-[linear-gradient(160deg,rgba(89,125,240,0.95),rgba(49,90,219,0.92))] p-10 text-white xl:flex">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/90">
              Design Your India
            </div>
            <div className="space-y-4">
              <h1 className="max-w-md text-4xl font-bold leading-tight">Travel operations made calm, clear, and conversion-focused.</h1>
              <p className="max-w-md text-sm leading-7 text-white/80">
                Manage leads, bookings, follow-ups, payments, and team activity from one place built for your daily CRM workflow.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-5 sm:p-8 xl:p-10">
          <Card className="w-full border-0 bg-transparent shadow-none">
            <CardHeader className="space-y-5 px-0 text-left">
              <div className="flex items-center gap-4 xl:hidden">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shadow-sm ring-1 ring-primary/10">
                  <img src="/dyi-logo.png" alt="Design Your India" className="h-10 w-auto object-contain" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-primary">Design Your India</div>
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Operations CRM</div>
                </div>
              </div>
              <div>
                <CardTitle className="text-3xl text-slate-950">Sign in</CardTitle>
                <CardDescription className="mt-2 text-sm text-muted-foreground">
                  Enter your credentials to access the operations workspace.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="h-12 rounded-2xl border-white bg-slate-50 pl-11 shadow-sm" placeholder="name@designyourindia.com" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="h-12 rounded-2xl border-white bg-slate-50 pl-11 shadow-sm" type="password" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="h-12 w-full rounded-2xl text-sm font-semibold" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    {!loginMutation.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex items-start gap-3 border-t border-slate-200/80 px-0 pt-6">
              <div className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Register
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
