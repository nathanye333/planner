import { Globe, Lock, Users, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VISIBILITY_META, type Visibility } from "@/lib/constants";

const ICONS = {
  private: Lock,
  friends: UserRound,
  group: Users,
  public: Globe,
} as const;

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const Icon = ICONS[visibility];
  return (
    <Badge variant="secondary" className="gap-1">
      <Icon className="size-3" />
      {VISIBILITY_META[visibility].label}
    </Badge>
  );
}
