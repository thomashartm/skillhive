'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const navItems = [
  //{ href: '/sessions', label: 'Training Sessions' },
  { href: '/curricula/my-curricula', label: 'Curricula' },
  { href: '/techniques', label: 'Techniques' },
  { href: '/videos/my-videos', label: 'Videos' },
];

export function MainNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' }).catch(() => {
      // Error handling is done by NextAuth
    });
  };

  const renderAuthButton = () => {
    if (status === 'loading') {
      return <div className="text-sm text-muted-foreground">Loading...</div>;
    }

    if (session) {
      return (
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {session.user?.name || session.user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-accent transition-colors"
          >
            Sign Out
          </button>
        </div>
      );
    }

    return (
      <Link
        href="/login"
        className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
      >
        Sign In
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-16 items-center justify-between px-2 md:px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image
              src="/skillhive-export.svg"
              alt="SkillHive Logo"
              width={60}
              height={60}
              className="text-foreground"
              priority
            />
            <span className="text-xl font-semibold hidden md:block"></span>
          </Link>
        </div>
        <div className="flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-foreground ${
                  isActive ? 'text-foreground border-primary pb-1' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {renderAuthButton()}
        </div>
      </div>
    </nav>
  );
}
