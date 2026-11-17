import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { AdminShell, type AdminDashboardStats } from './AdminShell';
import type { SiteLinks } from '../../schemas/siteLinks';

interface AdminAppProps {
  initialAuthenticated: boolean;
  stats: AdminDashboardStats;
  siteLinks: SiteLinks;
}

export const AdminApp: React.FC<AdminAppProps> = ({
  initialAuthenticated,
  stats,
  siteLinks,
}) => {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);

  if (!authenticated) {
    return <LoginForm onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <AdminShell
      stats={stats}
      siteLinks={siteLinks}
      onLogout={() => setAuthenticated(false)}
    />
  );
};
