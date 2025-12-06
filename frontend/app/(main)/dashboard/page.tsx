import { AuthUser } from "@aws-amplify/auth";
import { AuthEventData } from "@aws-amplify/ui";

export default function Dashboard({
  children,
  signOut,
  user,
}: {
  children: React.ReactNode;
  signOut?: ((data?: AuthEventData | undefined) => void) | undefined;
  user?: AuthUser | undefined;
}) {
  return <div>Dashboard</div>;
}
