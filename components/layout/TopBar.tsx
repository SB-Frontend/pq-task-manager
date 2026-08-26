"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import MobileNav from "@/components/layout/MobileNav";
import { NAV_ITEMS, SETTINGS_ITEM, isActive } from "@/components/layout/nav";
import { LogoutIcon, MenuIcon } from "@/components/ui/icons";
import { logoutAction } from "@/lib/auth/actions";
import { site } from "@/lib/site";
import type { PublicUser } from "@/types";

/** The title of the section currently being viewed. */
function usePageTitle(): string {
  const pathname = usePathname();
  const match = [...NAV_ITEMS, SETTINGS_ITEM].find((item) =>
    isActive(pathname, item.href),
  );

  return match?.label ?? site.name;
}

export default function TopBar({ user }: { user: PublicUser }) {
  const [navOpen, setNavOpen] = useState(false);
  const title = usePageTitle();

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Open navigation"
          aria-expanded={navOpen}
          className="-ml-1 rounded-md p-1.5 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 lg:hidden"
        >
          <MenuIcon className="size-5" />
        </button>

        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>

        <span className="hidden truncate text-sm text-muted sm:block">{user.name}</span>

        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Log out"
            title="Log out"
            className="-mr-1 rounded-md p-1.5 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          >
            <LogoutIcon className="size-5" />
          </button>
        </form>
      </header>

      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} user={user} />
    </>
  );
}
