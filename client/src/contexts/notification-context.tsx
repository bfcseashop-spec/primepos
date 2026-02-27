import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { NotificationPayload } from "@shared/notifications";
import type { AuthUser } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

export type ClientNotification = NotificationPayload & { read: boolean };

type NotificationContextValue = {
  notifications: ClientNotification[];
  unreadCount: number;
  markAllRead: () => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/ws/notifications`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      try {
        socket.send(
          JSON.stringify({
            type: "hello",
            userId: user.id,
            role: user.role,
            fullName: user.fullName,
          }),
        );
      } catch {
        // Ignore send errors.
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.type === "notification" && msg.payload) {
          const payload = msg.payload as NotificationPayload;
          setNotifications((prev) => [
            { ...payload, read: false },
            ...prev,
          ].slice(0, 50));

          // Show a toast for new notifications.
          toast({
            title: payload.title,
            description: payload.message,
          });
        }
      } catch {
        // Ignore malformed messages.
      }
    };

    socket.onerror = () => {
      // Best-effort only; we don't currently attempt reconnection.
    };

    return () => {
      try {
        socket.close();
      } catch {
        // ignore
      }
    };
  }, [user]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

