import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<TData> {
  id: string;
  header: ReactNode;
  cell: (row: TData) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[];
  data: TData[];
  emptyMessage?: string;
  getRowKey: (row: TData) => string;
  loading?: boolean;
  loadingMessage?: string;
  onRowClick?: (row: TData) => void;
}

function DataTable<TData>({
  columns,
  data,
  emptyMessage = "No results",
  getRowKey,
  loading = false,
  loadingMessage = "Loading",
  onRowClick,
}: DataTableProps<TData>) {
  const message = loading ? loadingMessage : emptyMessage;

  return (
    <div className="overflow-hidden rounded-12 border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.id} className={column.headerClassName}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-10 text-center text-muted-foreground"
              >
                {message}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={getRowKey(row)}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export { DataTable };
