import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, User, LogOut, Calendar, Clock } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

function LiveDateTime() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground" data-testid="text-live-datetime">
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" />
        <span>{dateStr}</span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        <span className="tabular-nums">{timeStr}</span>
      </div>
    </div>
  );
}

function getUser() {
  try {
    const saved = localStorage.getItem("clinicpos_user");
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function ProfileMenu() {
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const user = getUser();
  const displayName = user?.fullName || "Admin";
  const displayEmail = user?.email || "";
  const initials = getInitials(displayName);

  const handleLogout = () => {
    localStorage.removeItem("clinicpos_user");
    window.dispatchEvent(new Event("clinicpos_logout"));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-profile-menu">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{displayName}</p>
            {displayEmail && <p className="text-xs text-muted-foreground">{displayEmail}</p>}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setEditProfileOpen(true)} data-testid="menu-edit-profile">
            <User className="h-4 w-4 mr-2" />
            Edit Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); setEditProfileOpen(false); }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <Label htmlFor="profileName">Full Name</Label>
              <Input id="profileName" defaultValue={displayName} data-testid="input-profile-name" />
            </div>
            <div>
              <Label htmlFor="profileEmail">Email</Label>
              <Input id="profileEmail" type="email" defaultValue={displayEmail} data-testid="input-profile-email" />
            </div>
            <div>
              <Label htmlFor="profilePhone">Phone</Label>
              <Input id="profilePhone" defaultValue={user?.phone || ""} data-testid="input-profile-phone" />
            </div>
            <Button type="submit" className="w-full" data-testid="button-save-profile">
              Save Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between gap-2 p-3 border-b bg-background sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h1 className="text-sm font-semibold" data-testid="text-page-title">{title}</h1>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        <div className="hidden md:flex items-center">
          <LiveDateTime />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/billing")}
            data-testid="button-header-pos"
          >
            <FileText className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Make Payment (POS)</span>
            <span className="sm:hidden">POS</span>
          </Button>
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>
    </div>
  );
}
