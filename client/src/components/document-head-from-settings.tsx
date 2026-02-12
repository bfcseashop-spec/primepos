import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

type Settings = {
  appName?: string | null;
  appTagline?: string | null;
  logo?: string | null;
};

const DEFAULT_TITLE = "ClinicPOS";
const DEFAULT_FAVICON = "/favicon.png";

/**
 * When mounted (authenticated app), fetches settings and sets document title,
 * meta description, and favicon from app name, tagline, and logo.
 */
export function DocumentHeadFromSettings() {
  const { data: settings } = useQuery<Settings | null>({
    queryKey: ["/api/settings"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/"), { credentials: "include" });
      if (!res.ok) return null;
      const text = await res.text();
      if (!text || text.trimStart().startsWith("<")) return null;
      try {
        return JSON.parse(text) as Settings;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const name = settings?.appName?.trim() || DEFAULT_TITLE;
    const tagline = settings?.appTagline?.trim();
    document.title = tagline ? `${name} | ${tagline}` : name;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = tagline || name;

    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      const href = settings?.logo?.trim() || DEFAULT_FAVICON;
      favicon.href = href.startsWith("http") ? href : (window.location.origin + (href.startsWith("/") ? href : "/" + href));
      favicon.type = href.toLowerCase().endsWith(".svg") ? "image/svg+xml" : "image/png";
    }
  }, [settings?.appName, settings?.appTagline, settings?.logo]);

  return null;
}
