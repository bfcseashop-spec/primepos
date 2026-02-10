import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Users, FileText, Stethoscope, Pill,
  Receipt, Landmark, TrendingUp, UserCog, Settings,
  Cable, BarChart3, Activity, FlaskConical, CalendarCheck,
  UserRound, DollarSign, Shield, Heart
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

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10 dark:bg-blue-400/10" },
  { title: "OPD Management", url: "/opd", icon: Stethoscope, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10 dark:bg-emerald-400/10" },
  { title: "Appointments", url: "/appointments", icon: CalendarCheck, color: "text-violet-500 dark:text-violet-400", bg: "bg-violet-500/10 dark:bg-violet-400/10" },
  { title: "Make Payment (POS)", url: "/billing", icon: FileText, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10 dark:bg-amber-400/10" },
  { title: "Services", url: "/services", icon: Activity, color: "text-pink-500 dark:text-pink-400", bg: "bg-pink-500/10 dark:bg-pink-400/10" },
  { title: "Lab Tests", url: "/lab-tests", icon: FlaskConical, color: "text-cyan-500 dark:text-cyan-400", bg: "bg-cyan-500/10 dark:bg-cyan-400/10" },
  { title: "Medicines", url: "/medicines", icon: Pill, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500/10 dark:bg-orange-400/10" },
  { title: "Doctor Management", url: "/doctors", icon: UserRound, color: "text-teal-500 dark:text-teal-400", bg: "bg-teal-500/10 dark:bg-teal-400/10" },
];

const financeItems = [
  { title: "Expenses", url: "/expenses", icon: Receipt, color: "text-rose-500 dark:text-rose-400", bg: "bg-rose-500/10 dark:bg-rose-400/10" },
  { title: "Bank Transactions", url: "/bank", icon: Landmark, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-500/10 dark:bg-indigo-400/10" },
  { title: "Investments", url: "/investments", icon: TrendingUp, color: "text-green-500 dark:text-green-400", bg: "bg-green-500/10 dark:bg-green-400/10" },
  { title: "Salary", url: "/salary", icon: DollarSign, color: "text-yellow-500 dark:text-yellow-400", bg: "bg-yellow-500/10 dark:bg-yellow-400/10" },
];

const systemItems = [
  { title: "User and Role", url: "/staff", icon: UserCog, color: "text-sky-500 dark:text-sky-400", bg: "bg-sky-500/10 dark:bg-sky-400/10" },
  { title: "Authentication", url: "/authentication", icon: Shield, color: "text-red-500 dark:text-red-400", bg: "bg-red-500/10 dark:bg-red-400/10" },
  { title: "Integrations", url: "/integrations", icon: Cable, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/10 dark:bg-purple-400/10" },
  { title: "Reports", url: "/reports", icon: BarChart3, color: "text-lime-500 dark:text-lime-400", bg: "bg-lime-500/10 dark:bg-lime-400/10" },
  { title: "Settings", url: "/settings", icon: Settings, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-500/10 dark:bg-slate-400/10" },
];

function NavGroup({ label, items, isActive }: { label: string; items: typeof mainItems; isActive: (url: string) => boolean }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider opacity-60">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive(item.url)}>
                <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <span className={`inline-flex items-center justify-center rounded-md ${item.bg} p-1`}>
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                  </span>
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/") return location === "/";
    return location.startsWith(url);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-2">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer" data-testid="link-logo">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 dark:from-blue-400 dark:to-cyan-300 shadow-sm">
              <Heart className="h-5 w-5 text-white" fill="white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">ClinicPOS</span>
              <span className="text-[11px] text-muted-foreground">Management System</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Main" items={mainItems} isActive={isActive} />
        <NavGroup label="Finance" items={financeItems} isActive={isActive} />
        <NavGroup label="System" items={systemItems} isActive={isActive} />
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground text-center">
          ClinicPOS v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
