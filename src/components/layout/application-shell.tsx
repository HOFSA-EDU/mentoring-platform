"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, GraduationCap, LogOut, Menu, UserRound } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/modules/auth/application/actions";
import { roleLabels, type UserRole } from "@/modules/identity/domain/role";

import { roleShellConfig } from "./role-shell-config";

type ApplicationShellProps = {
  children: React.ReactNode;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ProductBrand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <GraduationCap aria-hidden="true" className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">BTS Mentoring</span>
        <span className="block text-xs text-muted-foreground">
          Student support workspace
        </span>
      </span>
    </Link>
  );
}

function RoleNavigation({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const navigation = roleShellConfig[role].navigation;

  return (
    <nav
      aria-label={`${roleLabels[role]} navigation`}
      className="flex flex-col gap-1"
    >
      {navigation.map(({ label, href, icon: Icon }) => {
        const isActive = href === pathname;

        if (!href) {
          return (
            <Tooltip key={label}>
              <TooltipTrigger
                render={
                  <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/50" />
                }
              >
                <Icon aria-hidden="true" className="size-4" />
                <span>{label}</span>
                <span className="sr-only">Unavailable in this phase</span>
              </TooltipTrigger>
              <TooltipContent side="right">
                Available in a later phase
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Link
            key={label}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ role }: { role: UserRole }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <ProductBrand />
      </div>
      <Separator />
      <div className="flex-1 px-3 py-5">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {roleLabels[role]} workspace
        </p>
        <RoleNavigation role={role} />
      </div>
      <Separator />
      <div className="px-4 py-4">
        <Badge variant="outline" className="font-normal">
          Secure workspace
        </Badge>
      </div>
    </div>
  );
}

export function ApplicationShell({
  children,
  user,
}: ApplicationShellProps) {
  const { role } = user;
  const initials = getInitials(user.name);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-sidebar md:block">
        <SidebarContent role={role} />
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open navigation"
                  />
                }
              >
                <Menu aria-hidden="true" data-icon="inline-start" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <SidebarContent role={role} />
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-sm font-semibold">{roleLabels[role]}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Authenticated workspace
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-10 gap-2 px-2"
                  aria-label="Open account menu"
                />
              }
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-36 truncate text-sm sm:block">
                {user.name}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="text-muted-foreground"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                  <span className="truncate text-foreground">{user.name}</span>
                  <span className="truncate font-normal">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuItem disabled>
                  <UserRound aria-hidden="true" />
                  Profile settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <form action={logoutAction}>
                  <DropdownMenuItem
                    render={<button type="submit" className="w-full" />}
                    nativeButton
                  >
                    <LogOut aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                </form>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
