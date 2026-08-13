"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatFCFA } from "@/lib/formatCurrency";
import { STATUS_COLORS, STATUS_LABELS, type Order, type OrderStatus } from "@/types";

const STATUS_OPTIONS: OrderStatus[] = ["pending", "delivering", "completed", "cancelled"];

interface OrdersTableProps {
  orders: Order[];
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

export default function OrdersTable({ orders, onStatusChange }: OrdersTableProps) {
  if (orders.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">Aucune commande pour ce filtre.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Référence</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Téléphone</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="align-top">
              <TableCell className="font-mono text-xs">{order.order_ref}</TableCell>
              <TableCell className="whitespace-nowrap">{new Date(order.created_at).toLocaleString("fr-FR")}</TableCell>
              <TableCell>{order.customer_name}</TableCell>
              <TableCell>
                <a href={`tel:${order.phone_number}`} className="text-primary underline">
                  {order.phone_number}
                </a>
              </TableCell>
              <TableCell className="font-medium">
                {formatFCFA(order.total_amount)}
                {order.promo_code && (
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Code {order.promo_code} (-{formatFCFA(order.discount_amount)})
                  </span>
                )}
              </TableCell>
              <TableCell>
                <a
                  href={order.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Voir sur Maps
                </a>
              </TableCell>
              <TableCell>
                <Select value={order.status} onValueChange={(value) => onStatusChange(order.id, value as OrderStatus)}>
                  <SelectTrigger
                    className={cn("h-9 w-44 border-transparent font-medium", STATUS_COLORS[order.status])}
                  >
                    <SelectValue>
                      <Badge variant="outline" className={cn("border-transparent", STATUS_COLORS[order.status])}>
                        {STATUS_LABELS[order.status]}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
