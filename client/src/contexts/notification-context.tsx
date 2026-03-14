import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { NotificationPayload } from "@shared/notifications";
import type { AuthUser } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/queryClient";

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

  const loadNotifications = () => {
    if (!user) return;
    fetch(getApiUrl("/api/notifications?limit=50"), { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return [];
        return await res.json();
      })
      .then((items: any[]) => {
        if (!Array.isArray(items)) return;
        setNotifications(
          items.map((n) => ({
            id: String(n.id),
            type: n.type,
            title: n.title,
            message: n.message,
            audience: n.audience,
            doctorName: n.doctorName ?? undefined,
            createdAt: n.createdAt,
            data: n.data ?? undefined,
            read: !!n.isRead,
          })),
        );
      })
      .catch(() => {
        // ignore
      });
  };

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

          // Show a toast for new notifications.
          toast({
            title: payload.title,
            description: payload.message,
          });

          // Play notification sound from bundled audio file (best-effort).
          try {
            const audio = new Audio("/sound.mp3");
            audio.volume = 0.6;
            // Autoplay may be blocked by the browser; ignore errors.
            void audio.play().catch(() => {});
          } catch {
            // ignore audio errors
          }

          // Refresh list from server so persisted notifications stay in sync.
          loadNotifications();
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

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAllRead = () => {
    if (!user) return;
    fetch(getApiUrl("/api/notifications/mark-read"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ all: true }),
    })
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      })
      .catch(() => {
        // ignore
      });
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

