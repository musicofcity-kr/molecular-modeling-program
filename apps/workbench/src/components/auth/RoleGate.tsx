import type { ReactNode } from 'react';
import { useUserSession } from '../../contexts/UserSessionContext';
import type { UserRole } from '../../types/session';

type RoleGateProps = {
  allow: UserRole[];
  children: ReactNode;
  fallback: ReactNode;
};

export function RoleGate({ allow, children, fallback }: RoleGateProps) {
  const { session } = useUserSession();

  if (!session || !allow.includes(session.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
