import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  toggleCollapsed: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  isCollapsed: false,
  toggle: () => {},
  toggleCollapsed: () => {},
  close: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('bizzy-sidebar-collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setIsCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem('bizzy-sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{
      isOpen,
      isCollapsed,
      toggle: () => setIsOpen((v) => !v),
      toggleCollapsed,
      close:  () => setIsOpen(false),
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSidebar = () => useContext(SidebarContext);
