import {
  CalendarRange,
  Settings,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/calendar", label: "My Planner", icon: CalendarRange },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/events", label: "Events", icon: CalendarRange },
  { href: "/friends", label: "Friends", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];
