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
  { href: "/groups", label: "Home", icon: Users },
  { href: "/events", label: "Events", icon: CalendarRange },
  { href: "/friends", label: "Friends", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings },
];
