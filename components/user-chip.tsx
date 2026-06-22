import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface MiniProfile {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

export function UserChip({
  profile,
  size = "default",
  href,
  subtitle,
}: {
  profile: MiniProfile;
  size?: "sm" | "default";
  href?: string;
  subtitle?: string;
}) {
  const avatarSize = size === "sm" ? "size-8" : "size-10";
  const content = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className={avatarSize}>
        <AvatarImage src={profile.avatar_url ?? undefined} />
        <AvatarFallback>{initials(profile.display_name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium leading-tight">
          {profile.display_name || "Unnamed"}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {subtitle ?? (profile.username ? `@${profile.username}` : "")}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={cn("hover:opacity-80")}>
        {content}
      </Link>
    );
  }
  return content;
}
