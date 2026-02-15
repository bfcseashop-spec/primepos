import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SearchableSelectOption {
  value: string;
  label: string;
  searchText?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  "data-testid"?: string;
  resetAfterSelect?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  "data-testid": testId,
  resetAfterSelect = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const filtered = options.filter((o) => {
    if (!search) return true;
    const text = (o.searchText || o.label).toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setSearch("");
    if (resetAfterSelect) {
      setTimeout(() => onValueChange(""), 0);
    }
  };

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const updatePosition = () => {
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setSearch("");
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-between font-normal",
          !value && "text-muted-foreground",
          className
        )}
        data-testid={testId}
      >
        <span className="truncate">
          {selectedLabel || placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && typeof document !== "undefined" && (() => {
        // Portal into the dialog content when inside a dialog so the focus trap includes the dropdown (search + scroll work)
        const portalTarget = (containerRef.current?.closest("[role=\"dialog\"]") as HTMLElement) ?? document.body;
        return createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[99999] rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{ top: position.top, left: position.left, width: Math.max(position.width, 200), minWidth: 200 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              data-testid={testId ? `${testId}-search` : undefined}
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto overflow-x-hidden overscroll-contain p-1" style={{ touchAction: "pan-y" }}>
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              filtered.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  data-testid={testId ? `${testId}-option-${option.value}` : undefined}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </div>
              ))
            )}
          </div>
        </div>,
        portalTarget
      );
      })()}
    </div>
  );
}
