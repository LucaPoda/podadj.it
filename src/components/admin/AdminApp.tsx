import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { AdminShell } from './AdminShell';
import {
  AdminWorkspaceProvider,
  type AdminDashboardStats,
} from './AdminWorkspaceContext';
import type { SiteLinks } from '../../schemas/siteLinks';

interface AdminAppProps {
  initialAuthenticated: boolean;
  stats: AdminDashboardStats;
  siteLinks: SiteLinks;
  fallbackSnapshot?: Record<string, unknown>;
}

export const AdminApp: React.FC<AdminAppProps> = ({
  initialAuthenticated,
  stats,
  siteLinks,
  fallbackSnapshot,
}) => {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);

  if (!authenticated) {
    return <LoginForm onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <AdminWorkspaceProvider
      fallbackStats={stats}
      fallbackSiteLinks={siteLinks}
      fallbackSnapshot={fallbackSnapshot}
    >
      <AdminShell onLogout={() => setAuthenticated(false)} />
    </AdminWorkspaceProvider>
  );
};
