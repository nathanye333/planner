import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { UserChip, type MiniProfile } from "@/components/user-chip";
import { FindFriends } from "@/components/friends/find-friends";
import {
  AcceptRequestButton,
  CancelRequestButton,
  DeclineRequestButton,
  RemoveFriendButton,
} from "@/components/friends/friend-actions";
import { FriendScheduleButton } from "@/components/friends/friend-scheduler";

type RequestRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender: MiniProfile | null;
  recipient: MiniProfile | null;
};

export default async function FriendsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: friendsRaw }, { data: incomingRaw }, { data: outgoingRaw }] =
    await Promise.all([
      supabase
        .from("friendships")
        .select(
          "friend:profiles!friendships_friend_id_fkey(id, display_name, username, avatar_url)",
        )
        .eq("user_id", profile.id),
      supabase
        .from("friend_requests")
        .select(
          "id, sender_id, recipient_id, sender:profiles!friend_requests_sender_id_fkey(id, display_name, username, avatar_url), recipient:profiles!friend_requests_recipient_id_fkey(id, display_name, username, avatar_url)",
        )
        .eq("recipient_id", profile.id)
        .eq("status", "pending"),
      supabase
        .from("friend_requests")
        .select(
          "id, sender_id, recipient_id, sender:profiles!friend_requests_sender_id_fkey(id, display_name, username, avatar_url), recipient:profiles!friend_requests_recipient_id_fkey(id, display_name, username, avatar_url)",
        )
        .eq("sender_id", profile.id)
        .eq("status", "pending"),
    ]);

  const friends = (friendsRaw ?? [])
    .map((f) => f.friend as MiniProfile | null)
    .filter((f): f is MiniProfile => !!f);
  const incoming = (incomingRaw ?? []) as RequestRow[];
  const outgoing = (outgoingRaw ?? []) as RequestRow[];

  const excludeIds = [
    profile.id,
    ...friends.map((f) => f.id),
    ...incoming.map((r) => r.sender_id),
    ...outgoing.map((r) => r.recipient_id),
  ];

  return (
    <div>
      <PageHeader
        title="Friends"
        description="Find people, manage requests, and grow your circle."
      />

      <Tabs defaultValue="friends">
        <TabsList className="gap-1">
          <TabsTrigger value="friends" className="flex-none px-4">
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-none px-4">
            Requests ({incoming.length})
          </TabsTrigger>
          <TabsTrigger value="find" className="flex-none px-4">
            Find
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4">
          {friends.length === 0 ? (
            <EmptyState text="No friends yet. Use the Find tab to add some." />
          ) : (
            <ul className="flex flex-col gap-2">
              {friends.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <UserChip profile={f} />
                  <div className="flex items-center gap-2">
                    <FriendScheduleButton
                      friend={f}
                      currentUser={{
                        id: profile.id,
                        display_name: profile.display_name,
                        username: profile.username,
                        avatar_url: profile.avatar_url,
                      }}
                    />
                    <RemoveFriendButton friendId={f.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <div className="flex flex-col gap-6">
            <section>
              <h3 className="mb-2 text-sm font-semibold">Incoming</h3>
              {incoming.length === 0 ? (
                <EmptyState text="No incoming requests." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {incoming.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      {r.sender && <UserChip profile={r.sender} />}
                      <div className="flex gap-2">
                        <AcceptRequestButton requestId={r.id} />
                        <DeclineRequestButton requestId={r.id} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Sent</h3>
              {outgoing.length === 0 ? (
                <EmptyState text="No pending sent requests." />
              ) : (
                <ul className="flex flex-col gap-2">
                  {outgoing.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      {r.recipient && <UserChip profile={r.recipient} />}
                      <CancelRequestButton requestId={r.id} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="find" className="mt-4">
          <Card>
            <CardContent>
              <FindFriends excludeIds={excludeIds} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
      {text}
    </p>
  );
}
