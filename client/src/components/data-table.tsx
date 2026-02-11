import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { FileX } from "lucide-react";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
}

export function DataTable<T extends { id: number }>({ columns, data, isLoading, emptyMessage = "No data found", onRowClick, selectedIds, onSelectionChange }: DataTableProps<T>) {
  const selectable = !!onSelectionChange && !!selectedIds;

  const allSelected = selectable && data.length > 0 && data.every(row => selectedIds!.has(row.id));
  const someSelected = selectable && data.some(row => selectedIds!.has(row.id)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(row => row.id)));
    }
  };

  const toggleRow = (id: number) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    if (typeof emptyMessage === "string") {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileX className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }
    return <>{emptyMessage}</>;
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  data-testid="checkbox-select-all"
                />
              </TableHead>
            )}
            {columns.map((col, i) => (
              <TableHead key={i} className={col.className}>{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              className={`${onRowClick ? "cursor-pointer" : ""} ${selectable && selectedIds!.has(row.id) ? "bg-primary/5" : ""}`}
              onClick={() => onRowClick?.(row)}
              data-testid={`row-data-${row.id}`}
            >
              {selectable && (
                <TableCell className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds!.has(row.id)}
                    onCheckedChange={() => toggleRow(row.id)}
                    data-testid={`checkbox-row-${row.id}`}
                  />
                </TableCell>
              )}
              {columns.map((col, i) => (
                <TableCell key={i} className={col.className}>
                  {typeof col.accessor === "function" ? col.accessor(row) : String(row[col.accessor] ?? "-")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
