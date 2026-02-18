/**
 * AppShell - Main layout with sidebar navigation
 * Fully responsive with mobile hamburger menu and sheet-based navigation
 */

import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Bot,
  Wallet,
  Settings,
  Mic,
  ChevronDown,
  ChevronRight,
  CalendarCheck,
  Menu,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";


interface AppShellProps {
  children: ReactNode;
}

// Navigation items configuration
const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Booking", href: "/bookings", icon: CalendarCheck },
  { label: "Billing", href: "/billing", icon: Wallet },
  { label: "Settings", href: "/settings", icon: Settings },
];

// Navigation Item Component
function NavItem({
  item,
  isActive,
  onClick
}: {
  item: typeof navItems[0];
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-orange-500 text-white"
          : "text-gray-300 hover:bg-gray-800 hover:text-white"
      )}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [aiAgentsExpanded, setAiAgentsExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isVoiceAgentActive = location === "/agents/voice";
  const isAiAgentsSectionActive = isVoiceAgentActive;

  // Check if a nav item is active
  const isNavItemActive = (href: string) => {
    if (href === "/dashboard") {
      return location === "/" || location === "/dashboard";
    }
    return location === href;
  };

  // Sidebar Content Component (reused for desktop and mobile)
  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className="h-16 px-4 sm:px-6 flex items-center border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg hidden sm:block">Bolna Dashboard</span>
          <span className="font-semibold text-lg sm:hidden">Bolna</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.slice(0, 3).map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isNavItemActive(item.href)}
            onClick={onNavClick}
          />
        ))}

        {/* AI Agents Expandable Section */}
        <div className="mt-2">
          <button
            onClick={() => setAiAgentsExpanded(!aiAgentsExpanded)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors",
              isAiAgentsSectionActive
                ? "bg-orange-500 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">AI Agents</span>
            </div>
            {aiAgentsExpanded ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )}
          </button>

          {/* Sub-menu items */}
          {aiAgentsExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              <Link
                href="/agents/voice"
                onClick={onNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isVoiceAgentActive
                    ? "bg-orange-500/80 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                <Mic className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Voice Agent</span>
              </Link>
            </div>
          )}
        </div>

        {/* Remaining nav items */}
        {navItems.slice(3).map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isNavItemActive(item.href)}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* User Info */}
      {user && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-orange-400">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.name || 'User'}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="mt-3 px-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Wallet Balance</span>
              <span className="text-green-400 font-medium">
                ₹{user.wallet?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Bar */}
        <header className="h-14 sm:h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] sm:w-[300px] bg-gray-900 text-white p-0 border-r-gray-800"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full">
                  <SidebarContent onNavClick={() => setMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Mobile Logo */}
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
                <Mic className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-base hidden sm:block">Bolna</span>
            </div>
          </div>

          {/* Right side of header - can be extended later */}
          <div className="flex items-center gap-2">
            {/* Add additional header items here if needed */}
          </div>
        </header>

        {/* Main Content Area - Responsive padding */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
