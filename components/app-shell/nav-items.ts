import {
  CalendarDays,
  CalendarRange,
  Home,
  Newspaper,
  Settings,
  Sparkles,
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
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/calendar", label: "My Calendar", icon: CalendarDays },
  { href: "/planners", label: "Planners", icon: Sparkles },
  { href: "/events", label: "Events", icon: CalendarRange },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/friends", label: "Friends", icon: UserRound },
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/settings", label: "Settings", icon: Settings },
];
