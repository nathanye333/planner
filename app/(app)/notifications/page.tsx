import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { Feed } from "@/components/feed/feed";

export default async function NotificationsPage() {
  const profile = await requireProfile();

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="What's happening with you and your friends."
      />

      <Tabs defaultValue="for-you">
        <TabsList>
          <TabsTrigger value="for-you">For You</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="for-you" className="mt-4">
          <NotificationsList userId={profile.id} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Feed userId={profile.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
