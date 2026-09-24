"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/schemas/auth";
import { loginAction } from "@/actions/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandmarkIcon, LockIcon, MailIcon, Loader2Icon, AlertCircleIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await loginAction(data);
      if (!res.success) {
        setErrorMsg(res.error || "Login failed. Please check your credentials.");
        toast.create({
          title: "Sign in failed",
          description: res.error || "Invalid credentials",
          type: "error",
        });
      } else {
        toast.create({
          title: "Welcome back!",
          description: "Authenticated successfully. Redirecting...",
          type: "success",
        });
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMsg("An unexpected system error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: "ADMIN" | "VERIFIER" | "STAFF_DANUMA" | "STAFF_MATALE") => {
    if (role === "ADMIN") {
      setValue("email", "admin@newgen.lk");
      setValue("password", "Admin@12345");
    } else if (role === "VERIFIER") {
      setValue("email", "verifier@newgen.lk");
      setValue("password", "Verifier@12345");
    } else if (role === "STAFF_DANUMA") {
      setValue("email", "staff.danuma@newgen.lk");
      setValue("password", "Staff@12345");
    } else {
      setValue("email", "staff.matale@newgen.lk");
      setValue("password", "Staff@12345");
    }
    setErrorMsg(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 transition-colors">
      <div className="w-full max-w-md space-y-6">
        {/* Branding Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <LandmarkIcon className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Newgen Finance ERP
          </h1>
          <p className="text-sm text-muted-foreground">
            Multi-Branch Cash Flow & Approval Management System
          </p>
        </div>

        {/* Card Form */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold">Sign In</CardTitle>
            <CardDescription>
              Enter your organizational credentials to access your dashboard
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="name@newgen.lk"
                    {...register("email")}
                    className="pl-9 h-10 text-sm"
                    autoComplete="email"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    className="pl-9 h-10 text-sm"
                    autoComplete="current-password"
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin mr-2" />
                    Authenticating...
                  </>
                ) : (
                  "Secure Sign In"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Fast-Switch Helpers */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <ShieldCheckIcon className="size-3.5 text-primary" />
            <span>Role Testing Shortcuts (Seeded Accounts)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickFill("ADMIN")}
              className="text-xs justify-start h-8 px-2 font-mono"
            >
              <Badge variant="outline" className="mr-1.5 text-[10px]">ADM</Badge>
              Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickFill("VERIFIER")}
              className="text-xs justify-start h-8 px-2 font-mono"
            >
              <Badge variant="outline" className="mr-1.5 text-[10px]">VER</Badge>
              Verifier
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickFill("STAFF_DANUMA")}
              className="text-xs justify-start h-8 px-2 font-mono"
            >
              <Badge variant="outline" className="mr-1.5 text-[10px]">STF</Badge>
              Danuma
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickFill("STAFF_MATALE")}
              className="text-xs justify-start h-8 px-2 font-mono"
            >
              <Badge variant="outline" className="mr-1.5 text-[10px]">STF</Badge>
              Matale
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
