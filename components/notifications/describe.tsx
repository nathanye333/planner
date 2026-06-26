import type { Tables } from "@/lib/types/database.types";

export type NotificationRow = Tables<"notifications"> & {
  actor: {
    display_name: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

/** Human-readable text and a deep link for a notification row. */
export function describeNotification(n: NotificationRow): {
  text: string;
  href: string | null;
} {
  const actor = n.actor?.display_name || "Someone";
  const payload = (n.payload ?? {}) as Record<string, string>;

  switch (n.type) {
    case "friend_request":
      return { text: `${actor} sent you a friend request`, href: "/friends" };
    case "friend_accept":
      return {
        text: `${actor} accepted your friend request`,
        href: "/friends",
      };
    case "group_invite":
      return {
        text: `${actor} added you to a group`,
        href: payload.group_id ? `/groups/${payload.group_id}` : "/groups",
      };
    case "event_invite":
      return {
        text: `${actor} invited you to an event`,
        href: payload.event_id ? `/events/${payload.event_id}` : "/events",
      };
    case "event_update":
      return {
        text: `${actor} updated an event`,
        href: payload.event_id ? `/events/${payload.event_id}` : "/events",
      };
    case "rsvp_change":
      return {
        text: `${actor} responded to your event`,
        href: payload.event_id ? `/events/${payload.event_id}` : "/events",
      };
    case "comment":
      return {
        text: `${actor} commented`,
        href:
          payload.target_type === "event" && payload.target_id
            ? `/events/${payload.target_id}`
            : "/notifications",
      };
    default:
      return { text: "New notification", href: null };
  }
}
