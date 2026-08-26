import { redirect } from "next/navigation";

import AuthCard from "@/components/auth/AuthCard";
import RegisterForm from "@/components/auth/RegisterForm";
import { getCurrentUser } from "@/lib/auth/auth";
import { isRegistrationOpen } from "@/lib/auth/registration";

export const metadata = { title: "Register" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/app");

  // Closed: send people to sign in rather than rendering a form they cannot
  // use. The server action is guarded independently, so this is presentation,
  // not the security boundary.
  if (!(await isRegistrationOpen())) redirect("/login");

  return (
    <AuthCard title="Create account" description="Start tracking your work.">
      <RegisterForm />
    </AuthCard>
  );
}
