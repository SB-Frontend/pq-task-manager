import SettingsView from "@/components/settings/SettingsView";
import { requireUser } from "@/lib/auth/auth";
import { getTheme } from "@/lib/settings/theme";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [user, theme] = await Promise.all([requireUser(), getTheme()]);

  return <SettingsView user={user} theme={theme} />;
}
