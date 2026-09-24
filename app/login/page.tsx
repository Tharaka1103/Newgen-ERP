"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/schemas/auth";
import { loginAction } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LockIcon,
  MailIcon,
  Loader2Icon,
  AlertCircleIcon,
  SunIcon,
  MoonIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRightIcon,
  ShieldAlertIcon,
  Building2Icon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

export default function LoginPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  // Theme synchronization
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDarkMode =
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

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
        setErrorMsg(res.error || "Invalid email or password.");
        toast.create({
          title: "Sign in failed",
          description: res.error || "Please check your credentials.",
          type: "error",
        });
      } else {
        toast.create({
          title: "Welcome back!",
          description: "Signed in successfully. Redirecting to workspace...",
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

  const handleQuickFill = (email: string, pass: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", pass, { shouldValidate: true });
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground antialiased grid lg:grid-cols-12 selection:bg-primary/20">
      {/* LEFT SIDE: Visual Showcase (Full SVG Display, Minimalist, No Gradients) */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-8 xl:p-12 bg-background">


        {/* Centerpiece Image - Fully Displayed */}
        <div className="my-auto flex items-center justify-center p-4">
          <div className="w-full max-w-[440px] p-4 shadow-sm transition-all">
            <Image
              src="/dashboard-card.svg"
              alt="Newgen ERP Visual Graphic"
              width={1123}
              height={1587}
              priority
              className="w-full h-auto max-h-[540px] object-contain rounded-xl select-none"
            />
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Pane */}
      <div className="col-span-12 lg:col-span-6 xl:col-span-5 flex flex-col justify-between min-h-screen p-6 sm:p-10 lg:p-12 bg-background relative">
        {/* Top Bar: Mobile Brand + Theme Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2Icon className="size-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">
              Newgen ERP
            </span>
          </div>
          <div className="hidden lg:block" />

          {/* Theme Switcher */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="h-8 gap-2 rounded-full border-border bg-card text-xs font-medium hover:bg-muted"
            aria-label="Toggle light or dark theme"
          >
            {isDark ? (
              <>
                <SunIcon className="size-3.5 text-warning" />
                <span>Light</span>
              </>
            ) : (
              <>
                <MoonIcon className="size-3.5 text-foreground" />
                <span>Dark</span>
              </>
            )}
          </Button>
        </div>

        {/* Center Container: Login Form */}
        <div className="mx-auto w-full max-w-sm space-y-6 my-auto py-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Sign In
            </h1>
            <p className="text-xs text-muted-foreground">
              Enter your credentials to access your organization workspace.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in-50">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Clean Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Email Address
              </label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  placeholder="name@newgen.lk"
                  {...register("email")}
                  className="pl-9 h-10 text-xs sm:text-sm font-medium"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <LockIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  {...register("password")}
                  className="pl-9 pr-10 h-10 text-xs sm:text-sm font-medium"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 font-semibold gap-2 shadow-xs text-xs sm:text-sm mt-2"
            >
              {loading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRightIcon className="size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Fill Testing Helper (Minimalist Pills) */}
          <div className="pt-4 border-t border-border space-y-2">
            <div className="text-[11px] font-medium text-muted-foreground">
              Demo Access:
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => handleQuickFill("admin@newgen.lk", "Admin@12345")}
                className="text-xs h-7 px-2.5 rounded-md hover:bg-muted"
              >
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => handleQuickFill("verifier@newgen.lk", "Verifier@12345")}
                className="text-xs h-7 px-2.5 rounded-md hover:bg-muted"
              >
                Verifier
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => handleQuickFill("staff.danuma@newgen.lk", "Staff@12345")}
                className="text-xs h-7 px-2.5 rounded-md hover:bg-muted"
              >
                Danuma
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => handleQuickFill("staff.matale@newgen.lk", "Staff@12345")}
                className="text-xs h-7 px-2.5 rounded-md hover:bg-muted"
              >
                Matale
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-muted-foreground pt-4">
          © 2026 Newgen Educational Systems
        </div>
      </div>

      {/* FORGOT PASSWORD DIALOG */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlertIcon className="size-5 text-primary" />
              <span>Forgot Password</span>
            </DialogTitle>
            <DialogDescription>
              Please contact your system administrator to reset your credentials.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-lg bg-amber-400/10 border border-amber-400 p-3.5 space-y-1.5">
              <p className="text-muted-foreground leading-relaxed pt-1">
                For branch cash security, self-service password recovery is restricted. Please reach out to your administrator or the internal IT desk to obtain new login credentials.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              size="sm"
              onClick={() => setForgotOpen(false)}
            >
              Understood!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
