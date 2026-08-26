import { redirect } from "next/navigation";

import AuthCard from "@/components/auth/AuthCard";
import RegisterForm from "@/components/auth/RegisterForm";
import { getCurrentUser } from "@/lib/auth/auth";
import {
  isRegistrationOpen,
  REGISTRATION_CLOSED_MESSAGE,
} from "@/lib/auth/registration";
import ButtonLink from "@/components/ui/ButtonLink";

export const metadata = { title: "Register" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/app");

  if (!(await isRegistrationOpen())) {
    return (
      <AuthCard title="Registration closed" description={REGISTRATION_CLOSED_MESSAGE}>
        <ButtonLink href="/login" fullWidth>
          Back to sign in
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create account" description="Start tracking your work.">
      <RegisterForm />
    </AuthCard>
  );
}
