import CreateUserForm from "@/components/settings/CreateUserForm";
import { formatDate } from "@/lib/format";
import type { PublicUser } from "@/types";

/**
 * Owner-only view of the accounts on this instance.
 *
 * An account sees only the work assigned to it (lib/auth/scope.ts), so the copy
 * states what it actually grants rather than overstating it in either
 * direction.
 */
export default function UsersSection({
  users,
  ownerId,
}: {
  users: PublicUser[];
  ownerId: string | null;
}) {
  return (
    <div className="space-y-6">
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user.name}
                {user.id === ownerId && (
                  <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-xs font-normal text-muted">
                    Owner
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>

            <p className="shrink-0 text-xs text-muted">
              Added {formatDate(user.createdAt)}
            </p>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Add an account</h3>
          <p className="mt-1 text-sm text-muted">
            A new account sees only the tasks you assign to it, and the projects
            those tasks belong to. It cannot create or change projects, create
            or delete tasks, or reassign its own work.
          </p>
        </div>

        <CreateUserForm />
      </div>
    </div>
  );
}
