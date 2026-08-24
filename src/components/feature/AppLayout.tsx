import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useSidebar } from '@/contexts/SidebarContext';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <Topbar />
      <main className={`pt-16 min-h-screen min-w-0 overflow-x-hidden transition-[margin] duration-200 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="min-w-0 max-w-full p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
