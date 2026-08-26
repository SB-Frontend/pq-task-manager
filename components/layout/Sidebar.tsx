"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, SETTINGS_ITEM, isActive, type NavItem } from "@/components/layout/nav";
import { LogoutIcon } from "@/components/ui/icons";
import { logoutAction } from "@/lib/auth/actions";
import { site } from "@/lib/site";
import type { PublicUser } from "@/types";

interface SidebarProps {
  user: PublicUser;
  /** Lets the mobile drawer close itself once a link is followed. */
  onNavigate?: () => void;
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 ${
        active
          ? "bg-foreground/8 font-medium text-foreground"
          : "text-muted hover:bg-foreground/5 hover:text-foreground"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

/** Sidebar contents, rendered both in the desktop rail and the mobile drawer. */
export default function Sidebar({ user, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link
          href="/app"
          onClick={onNavigate}
          className="rounded text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        >
          {site.name}
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}

        <hr className="my-3 border-border" />

        <NavLink
          item={SETTINGS_ITEM}
          active={isActive(pathname, SETTINGS_ITEM.href)}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <div className="mb-2 min-w-0 px-2.5">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          >
            <LogoutIcon className="size-4 shrink-0" />
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
