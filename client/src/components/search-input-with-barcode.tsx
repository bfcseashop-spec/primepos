import * as React from "react";
import { Barcode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputWithBarcodeProps
  extends Omit<React.ComponentProps<typeof Input>, "onSearch"> {
  /** Called when user presses Enter (e.g. after barcode scanner input). Optional. */
  onSearch?: (value: string) => void;
  /** Optional class for the wrapper. */
  wrapperClassName?: string;
}

/**
 * Search input that shows a barcode icon and supports barcode scanner input.
 * Scanners typically type the code and send Enter; use onSearch to react to Enter.
 */
const SearchInputWithBarcode = React.forwardRef<HTMLInputElement, SearchInputWithBarcodeProps>(
  ({ className, onSearch, wrapperClassName, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        const value = (e.target as HTMLInputElement).value?.trim() ?? "";
        onSearch(value);
      }
      onKeyDown?.(e);
    };

    return (
      <div className={cn("relative flex items-center", wrapperClassName)}>
        <Barcode className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
        <Input
          ref={ref}
          className={cn("pl-9", className)}
          onKeyDown={handleKeyDown}
          {...props}
        />
      </div>
    );
  }
);

SearchInputWithBarcode.displayName = "SearchInputWithBarcode";

export { SearchInputWithBarcode };
