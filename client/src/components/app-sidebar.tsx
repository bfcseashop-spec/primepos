import { useLocation, Link } from "wouter";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, FileText, Stethoscope, Pill,
  Receipt, Landmark, TrendingUp, UserCog, Settings,
  Cable, BarChart3, Activity, FlaskConical, CalendarCheck,
  UserRound, DollarSign, Shield, Heart, LogOut, ChevronRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, gradient: "from-blue-500 to-cyan-400" },
  { title: "Make Payment (POS)", url: "/billing", icon: FileText, gradient: "from-amber-500 to-orange-400" },
  { title: "OPD Management", url: "/opd", icon: Stethoscope, gradient: "from-emerald-500 to-teal-400" },
  { title: "Appointments", url: "/appointments", icon: CalendarCheck, gradient: "from-violet-500 to-purple-400" },
  { title: "Services", url: "/services", icon: Activity, gradient: "from-pink-500 to-rose-400" },
  { title: "Lab Tests", url: "/lab-tests", icon: FlaskConical, gradient: "from-cyan-500 to-sky-400" },
  { title: "Medicines", url: "/medicines", icon: Pill, gradient: "from-orange-500 to-amber-400" },
  { title: "Doctor Management", url: "/doctors", icon: UserRound, gradient: "from-teal-500 to-emerald-400" },
];

const financeItems = [
  { title: "Expenses", url: "/expenses", icon: Receipt, gradient: "from-rose-500 to-pink-400" },
  { title: "Bank Transactions", url: "/bank", icon: Landmark, gradient: "from-indigo-500 to-blue-400" },
  { title: "Investments", url: "/investments", icon: TrendingUp, gradient: "from-green-500 to-emerald-400" },
  { title: "Salary", url: "/salary", icon: DollarSign, gradient: "from-yellow-500 to-amber-400" },
];

const systemItems = [
  { title: "User and Role", url: "/staff", icon: UserCog, gradient: "from-sky-500 to-cyan-400" },
  { title: "Authentication", url: "/authentication", icon: Shield, gradient: "from-red-500 to-rose-400" },
  { title: "Integrations", url: "/integrations", icon: Cable, gradient: "from-purple-500 to-violet-400" },
  { title: "Reports", url: "/reports", icon: BarChart3, gradient: "from-lime-500 to-green-400" },
  { title: "Settings", url: "/settings", icon: Settings, gradient: "from-slate-400 to-zinc-400" },
];

function NavGroup({ label, items, isActive }: { label: string; items: typeof mainItems; isActive: (url: string) => boolean }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-300/50 px-3 mb-1">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  className={active ? "bg-gradient-to-r from-blue-600/20 to-violet-600/20 text-white border-0" : "text-slate-400 border-0"}
                >
                  <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <span className={`inline-flex items-center justify-center rounded-md p-1 ${active ? `bg-gradient-to-br ${item.gradient} shadow-sm` : "bg-white/5"}`}>
                      <item.icon className={`h-3.5 w-3.5 ${active ? "text-white" : "text-slate-400"}`} />
                    </span>
                    <span className={`text-[13px] ${active ? "font-semibold text-white" : ""}`}>{item.title}</span>
                    {active && (
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-blue-400/60" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("clinicpos_user");
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch {}
  }, []);

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  const handleLogout = () => {
    window.dispatchEvent(new Event("clinicpos_logout"));
  };

  const userInitials = currentUser?.fullName
    ? currentUser.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-3">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group" data-testid="link-logo">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 shadow-lg shadow-blue-500/20">
              <Heart className="h-5 w-5 text-white" fill="white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white">ClinicPOS</span>
              <span className="text-[10px] text-blue-300/60 font-medium">Management System</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <div className="px-4 pb-2">
        <Separator className="bg-white/[0.06]" />
      </div>

      <SidebarContent className="px-1">
        <NavGroup label="Main" items={mainItems} isActive={isActive} />
        <NavGroup label="Finance" items={financeItems} isActive={isActive} />
        <NavGroup label="System" items={systemItems} isActive={isActive} />
      </SidebarContent>

      <div className="px-4 pt-1">
        <Separator className="bg-white/[0.06]" />
      </div>

      <SidebarFooter className="p-3">
        {currentUser && (
          <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-2.5 py-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-500 text-white text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.email || currentUser.username}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleLogout}
              className="shrink-0 text-slate-400"
              data-testid="button-sidebar-logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {!currentUser && (
          <div className="text-[10px] text-slate-500 text-center font-medium">
            ClinicPOS v1.0
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
