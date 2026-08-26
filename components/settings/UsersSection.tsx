import CreateUserForm from "@/components/settings/CreateUserForm";
import { formatDate } from "@/lib/format";
import type { PublicUser } from "@/types";

/**
 * Owner-only view of the accounts on this instance.
 *
 * Everyone who has an account can see all data, so adding one is a meaningful
 * act - the copy says so plainly rather than implying it grants limited access.
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
            Anyone with an account can see and edit every project, task and work
            log. Tasks can then be assigned to them.
          </p>
        </div>

        <CreateUserForm />
      </div>
    </div>
  );
}
