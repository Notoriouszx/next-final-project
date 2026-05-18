"use client";

import * as React from "react";
import { Activity, LogOut, Settings, User } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { roleBadgeVariant } from "@/lib/role-badge";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ROLE_ACCENT } from "@/lib/navigation-config";

interface NavbarProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function Navbar({ user }: NavbarProps) {
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const role = user?.role as UserRole | undefined;

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = `/${locale}/auth/login`;
  };

  const settingsHref =
    role === "patient" ? "/dashboard/security" : "/dashboard/settings";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-card/85 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
              role ? ROLE_ACCENT[role] : "from-primary to-info"
            )}
          >
            <Activity className="h-5 w-5" />
          </div>
          <span className="truncate text-lg font-bold tracking-tight sm:text-xl">
            <span className="text-gradient-brand">Medi</span>
            <span className="text-foreground">Care</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <LanguageSwitcher />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 gap-2 rounded-full ps-1 pe-2">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarFallback
                      className={cn(
                        "bg-gradient-to-br text-xs font-semibold text-white",
                        role ? ROLE_ACCENT[role] : "from-primary to-info"
                      )}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[8rem] truncate text-sm font-medium sm:inline">
                    {user.name.split(" ")[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-semibold leading-none">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    {role ? (
                      <Badge variant={roleBadgeVariant(role)} className="w-fit capitalize">
                        {role}
                      </Badge>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <User className="me-2 h-4 w-4" />
                    {t("dashboard") ?? "Dashboard"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={settingsHref} className="cursor-pointer">
                    <Settings className="me-2 h-4 w-4" />
                    {t("settings") ?? "Settings"}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="me-2 h-4 w-4" />
                  {t("logout") ?? "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild size="sm">
                <Link href="/auth/login">{t("login") ?? "Login"}</Link>
              </Button>
              <Button variant="gradient" asChild size="sm">
                <Link href="/auth/register">{t("register") ?? "Sign up"}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
