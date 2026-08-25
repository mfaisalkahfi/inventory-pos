'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Database, Package, FileText, ShoppingCart,
  Users, BarChart3, Settings, LogOut, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, MenuItem } from '@/store/auth';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const iconMap: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Database,
  Package,
  FileText,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
};

function SidebarItem({ item }: { item: MenuItem }) {
  const pathname = usePathname();
  const Icon = iconMap[item.icon] || LayoutDashboard;

  // Resolve route: /dashboard stays, /pos stays, others get /dashboard prefix
  const resolvedRoute = item.route === '/dashboard' || item.route === '/pos'
    ? item.route
    : item.route.startsWith('/dashboard/')
      ? item.route
      : `/dashboard${item.route}`;

  const isActive = pathname === resolvedRoute || pathname.startsWith(resolvedRoute + '/');

  return (
    <Link
      href={resolvedRoute}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
      {item.name}
    </Link>
  );
}

export function Sidebar() {
  const { menu, user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    api.get('/master/company').then(res => {
      setCompany(res.data.data ?? res.data);
    }).catch(() => {});
  }, []);

  return (
    <>
      <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 lg:hidden" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <aside className={cn('fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transition-transform lg:translate-x-0', collapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-4 gap-3">
            {company?.logo && <img src={company.logo} alt="Logo" className="h-9 w-9 object-contain" />}
            <h1 className="text-sm font-bold leading-tight truncate">{company?.companyName || 'Inventory & POS'}</h1>
          </div>

          {/* Menu */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menu.map((item) => (
              <SidebarItem key={item.id} item={item} />
            ))}
            {menu.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Loading menu...</p>
            )}
          </nav>

          {/* User */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium">
                  {user?.fullName?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => {
                logout();
                window.location.href = '/auth/login';
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
