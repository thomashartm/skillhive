'use client';

import { ReactNode } from 'react';
import { MainNav } from '../navigation/MainNav';
import { Sidebar } from '../navigation/Sidebar';

interface AppLayoutProps {
  children: ReactNode;
  sidebarItems?: Array<{ href: string; label: string; icon?: React.ReactNode }>;
  sidebarTitle?: string;
}

export function AppLayout({ children, sidebarItems, sidebarTitle }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <div className="flex flex-1 overflow-hidden">
        {sidebarItems && sidebarItems.length > 0 && (
          <Sidebar items={sidebarItems} title={sidebarTitle} />
        )}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
