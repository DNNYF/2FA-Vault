import React from 'react';
import { KeyRound, Search, Plus, Trash2, Settings, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'recycle' | 'settings';
  onNavigate: (page: 'dashboard' | 'recycle' | 'settings') => void;
  onLogout: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  recycleCount: number;
}

export function AppLayout({ children, currentPage, onNavigate, onLogout, isDark, toggleTheme, recycleCount }: LayoutProps) {
  const NavItems = () => (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-3 text-primary font-bold text-xl tracking-tight">
          <div className="bg-primary/10 p-2 rounded-lg">
            <KeyRound className="h-6 w-6" />
          </div>
          2FA Vault
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <Button
          variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'}
          className={cn("w-full justify-start text-base", currentPage === 'dashboard' && "bg-secondary/50 font-semibold")}
          onClick={() => onNavigate('dashboard')}
        >
          <KeyRound className="mr-3 h-5 w-5" />
          All Accounts
        </Button>
        <Button
          variant={currentPage === 'recycle' ? 'secondary' : 'ghost'}
          className={cn("w-full justify-start text-base relative", currentPage === 'recycle' && "bg-secondary/50 font-semibold")}
          onClick={() => onNavigate('recycle')}
        >
          <Trash2 className="mr-3 h-5 w-5" />
          Recycle Bin
          {recycleCount > 0 && (
            <span className="absolute right-3 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              {recycleCount}
            </span>
          )}
        </Button>
        <Button
          variant={currentPage === 'settings' ? 'secondary' : 'ghost'}
          className={cn("w-full justify-start text-base", currentPage === 'settings' && "bg-secondary/50 font-semibold")}
          onClick={() => onNavigate('settings')}
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </Button>
      </nav>

      <div className="p-4 mt-auto border-t">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" className="flex-1 justify-start text-muted-foreground" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground shrink-0">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-72 border-r bg-card/30 backdrop-blur-xl">
        <NavItems />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2 font-bold">
            <KeyRound className="h-5 w-5 text-primary" />
            2FA Vault
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <NavItems />
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
