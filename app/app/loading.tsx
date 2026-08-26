import LoadingState from "@/components/ui/LoadingState";

/**
 * Shown while any route under /app streams in.
 *
 * Next applies this to every nested segment that does not define its own, so
 * one file covers the dashboard, projects, tasks and work logs.
 */
export default function Loading() {
  return <LoadingState />;
}
