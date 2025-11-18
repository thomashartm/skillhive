'use client';

import React, { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from './components/common/NotificationProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </SessionProvider>
  );
}
