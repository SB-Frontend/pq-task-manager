import {
  ClockIcon,
  DashboardIcon,
  ProjectsIcon,
  SettingsIcon,
  TasksIcon,
} from "@/components/ui/icons";

export interface NavItem {
  label: string;
  href: string;
  icon: typeof DashboardIcon;
}

/** Primary navigation, shared by the desktop sidebar and the mobile drawer. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: DashboardIcon },
  { label: "Projects", href: "/app/projects", icon: ProjectsIcon },
  { label: "Tasks", href: "/app/tasks", icon: TasksIcon },
  { label: "Work logs", href: "/app/work-logs", icon: ClockIcon },
];

/** Kept separate so it can sit below a divider. */
export const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/app/settings",
  icon: SettingsIcon,
};

/** True when a nav item represents the current page. */
export function isActive(pathname: string, href: string): boolean {
  // /app would otherwise match every nested route.
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}
