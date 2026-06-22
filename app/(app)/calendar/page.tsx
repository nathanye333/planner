import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AvailabilityEditor } from "@/components/calendar/availability-editor";

export default async function CalendarPage() {
  const profile = await requireProfile();

  return (
    <div>
      <PageHeader
        title="My Calendar"
        description="Mark when you're free, tentative, or busy. Synced Google events show as Busy — only you can see the details."
      />
      <Card>
        <CardContent>
          <AvailabilityEditor userId={profile.id} />
        </CardContent>
      </Card>
    </div>
  );
}
