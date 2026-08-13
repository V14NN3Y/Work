"use client";

import { useCallback, useEffect, useState } from "react";
import OrdersTable from "@/components/admin/OrdersTable";
import { PaginationButtons } from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminListOrders, adminUpdateOrderStatus, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABELS, type Order, type OrderStatus } from "@/types";

const FILTERS: (OrderStatus | "all")[] = ["all", "pending", "delivering", "completed", "cancelled"];

export default function AdminOrdersPage() {
  const [supabase] = useState(() => createClient());
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListOrders(supabase, { status: filter === "all" ? undefined : filter, page });
      setOrders(data.items);
      setTotal(data.total);
      setPageSize(data.page_size);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger les commandes");
    } finally {
      setLoading(false);
    }
  }, [filter, page, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    try {
      await adminUpdateOrderStatus(supabase, orderId, status);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de mettre à jour le statut");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">Commandes</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            type="button"
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Toutes" : STATUS_LABELS[f]}
            {f === filter && ` (${total})`}
          </Button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <OrdersTable orders={orders} onStatusChange={handleStatusChange} />
          <PaginationButtons page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
