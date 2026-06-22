import { requireProfile } from "@/lib/auth";
import { MobileNav, Sidebar } from "@/components/app-shell/sidebar";
import { UserMenu } from "@/components/app-shell/user-menu";
import { NotificationsBell } from "@/components/notifications/notifications-bell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-30 flex items-center justify-end gap-2 border-b px-4 py-2.5 backdrop-blur md:px-6">
          <NotificationsBell userId={profile.id} />
          <UserMenu
            name={profile.display_name}
            username={profile.username}
            avatarUrl={profile.avatar_url}
          />
        </header>
        <MobileNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
