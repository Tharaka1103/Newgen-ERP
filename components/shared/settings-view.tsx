"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileSchema,
  changePasswordSchema,
  UpdateProfileInput,
  ChangePasswordInput,
} from "@/schemas/auth";
import { updateProfileAction, changePasswordAction } from "@/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserIcon,
  LockIcon,
  ShieldCheckIcon,
  PhoneIcon,
  MailIcon,
  Loader2Icon,
  BuildingIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface SettingsViewProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
    phone?: string;
    shop?: string | null;
    shopName?: string | null;
  };
}

export function SettingsView({ user }: SettingsViewProps) {
  // Profile Form
  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name || "",
      phone: user.phone || "",
      avatarUrl: "",
    },
  });

  // Security Form
  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data: UpdateProfileInput) => {
    const res = await updateProfileAction(data);
    if (res.success) {
      toast.create({
        title: "Profile updated",
        description: "Your profile information has been saved.",
        type: "success",
      });
    } else {
      toast.create({
        title: "Update failed",
        description: res.error || "Failed to update profile",
        type: "error",
      });
    }
  };

  const onPasswordSubmit = async (data: ChangePasswordInput) => {
    const res = await changePasswordAction(data);
    if (res.success) {
      toast.create({
        title: "Password changed",
        description: "Your password has been securely updated.",
        type: "success",
      });
      passwordForm.reset();
    } else {
      toast.create({
        title: "Password update failed",
        description: res.error || "Failed to change password",
        type: "error",
      });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Account & Security Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal identity credentials and access password
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="profile" className="gap-2 text-xs">
            <UserIcon className="size-3.5" />
            Profile Details
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 text-xs">
            <LockIcon className="size-3.5" />
            Security & Password
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
              <CardDescription>
                Update your contact details and view organizational assignment
              </CardDescription>
            </CardHeader>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
                    <div className="relative">
                      <MailIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                      <Input value={user.email || ""} disabled className="pl-9 h-9 text-xs bg-muted/40 font-mono" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Primary login identifier (read-only)</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Role</label>
                    <div className="h-9 flex items-center">
                      <Badge variant="outline" className="font-mono uppercase text-xs">
                        <ShieldCheckIcon className="size-3 mr-1 text-primary" />
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Full Name</label>
                  <Input placeholder="John Doe" {...profileForm.register("name")} className="h-9 text-xs" />
                  {profileForm.formState.errors.name && (
                    <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Phone Number</label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input placeholder="+94 77 123 4567" {...profileForm.register("phone")} className="pl-9 h-9 text-xs" />
                  </div>
                </div>

                {user.shopName && (
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BuildingIcon className="size-4 text-primary" />
                      <span className="text-xs font-medium">Assigned Operational Branch:</span>
                    </div>
                    <span className="text-xs font-bold text-foreground">{user.shopName}</span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-border pt-4">
                <Button type="submit" size="sm" disabled={profileForm.formState.isSubmitting}>
                  {profileForm.formState.isSubmitting ? (
                    <Loader2Icon className="size-3.5 animate-spin mr-1" />
                  ) : null}
                  Save Profile Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Change Password</CardTitle>
              <CardDescription>
                Ensure your account uses a strong password with symbols, numbers, and uppercase characters
              </CardDescription>
            </CardHeader>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...passwordForm.register("currentPassword")}
                    className="h-9 text-xs"
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    New Password (min 8 chars, 1 uppercase, 1 number, 1 special)
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...passwordForm.register("newPassword")}
                    className="h-9 text-xs"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...passwordForm.register("confirmPassword")}
                    className="h-9 text-xs"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t border-border pt-4">
                <Button type="submit" size="sm" disabled={passwordForm.formState.isSubmitting}>
                  {passwordForm.formState.isSubmitting ? (
                    <Loader2Icon className="size-3.5 animate-spin mr-1" />
                  ) : null}
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
