import { MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFCFA } from "@/lib/formatCurrency";
import { STATUS_COLORS, STATUS_LABELS, type Order } from "@/types";

interface OrderStatusCardProps {
  order: Order;
  onForget?: () => void;
}

export default function OrderStatusCard({ order, onForget }: OrderStatusCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-semibold">{order.order_ref}</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={STATUS_COLORS[order.status]}>
              {STATUS_LABELS[order.status]}
            </Badge>
            {onForget && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Retirer de mes commandes"
                className="h-7 w-7 text-muted-foreground"
                onClick={onForget}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <ul className="divide-y divide-border text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between py-2">
              <span>Quantité : {item.quantity}</span>
              <span>{formatFCFA(parseFloat(item.unit_price) * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-border pt-3">
          {parseFloat(order.discount_amount) > 0 && (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Sous-total</span>
                <span>{formatFCFA(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-status-completed">
                <span>Réduction {order.promo_code && `(${order.promo_code})`}</span>
                <span>-{formatFCFA(order.discount_amount)}</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary">{formatFCFA(order.total_amount)}</span>
          </div>
        </div>
        <a
          href={order.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary underline"
        >
          <MapPin className="h-3.5 w-3.5" />
          Voir le lieu de livraison sur Maps
        </a>
      </CardContent>
    </Card>
  );
}
