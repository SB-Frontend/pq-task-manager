import { redirect } from "next/navigation";

import AuthCard from "@/components/auth/AuthCard";
import RegisterForm from "@/components/auth/RegisterForm";
import { getCurrentUser } from "@/lib/auth/auth";

export const metadata = { title: "Register" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/app");

  return (
    <AuthCard title="Create account" description="Start tracking your work.">
      <RegisterForm />
    </AuthCard>
  );
}
