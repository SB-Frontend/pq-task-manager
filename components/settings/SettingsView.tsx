import AppearanceForm from "@/components/settings/AppearanceForm";
import PasswordForm from "@/components/settings/PasswordForm";
import UsersSection from "@/components/settings/UsersSection";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import { logoutAction } from "@/lib/auth/actions";

import type { PublicUser, Theme } from "@/types";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SettingsView({
  user,
  theme,
  users,
  ownerId,
}: {
  user: PublicUser;
  theme: Theme;
  /** Present only when the signed-in user owns the instance. */
  users?: PublicUser[];
  ownerId?: string | null;
}) {
  const isOwner = users !== undefined;
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your appearance and account." />

      <Section
        title="Appearance"
        description="Choose a theme, or follow your system setting."
      >
        <AppearanceForm theme={theme} />
      </Section>

      <Section title="Account">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs text-muted">Name</dt>
            <dd className="mt-0.5 truncate text-sm">{user.name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted">Email</dt>
            <dd className="mt-0.5 truncate text-sm">{user.email}</dd>
          </div>
        </dl>
      </Section>

      <Section
        title="Change password"
        description="Changing your password signs out your other sessions."
      >
        <PasswordForm />
      </Section>

      {isOwner && (
        <Section
          title="Accounts"
          description="You own this instance, so you can add accounts."
        >
          <UsersSection users={users} ownerId={ownerId ?? null} />
        </Section>
      )}

      <Section title="Session" description="You are signed in on this device.">
        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            Log out
          </Button>
        </form>
      </Section>
    </div>
  );
}
