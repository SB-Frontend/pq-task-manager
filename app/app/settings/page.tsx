import SettingsView from "@/components/settings/SettingsView";
import { requireUser } from "@/lib/auth/auth";
import { getOwnerId } from "@/lib/auth/ownership";
import { getTheme } from "@/lib/settings/theme";
import { listUsers } from "@/lib/users/queries";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [user, theme, ownerId] = await Promise.all([
    requireUser(),
    getTheme(),
    getOwnerId(),
  ]);

  // The account list is only fetched for the owner, so it cannot leak.
  const owns = ownerId === user.id;
  const users = owns ? await listUsers() : undefined;

  return (
    <SettingsView user={user} theme={theme} users={users} ownerId={ownerId} />
  );
}
