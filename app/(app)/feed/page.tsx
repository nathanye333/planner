import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Feed } from "@/components/feed/feed";

export default async function FeedPage() {
  const profile = await requireProfile();

  return (
    <div>
      <PageHeader
        title="Feed"
        description="What your friends and groups are up to."
      />
      <Feed userId={profile.id} />
    </div>
  );
}
