import { Router } from "express";
import { z } from "zod";
import { createOrderWithItems } from "../storage";

const orderItemSchema = z.object({
  productSlug: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.string(),
  totalPrice: z.string(),
});

const orderSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().nullable().optional(),
  customerPhone: z.string().min(1),
  shippingCep: z.string().min(1),
  shippingAddress: z.string().min(1),
  shippingNumber: z.string().min(1),
  shippingComplement: z.string().nullable().optional(),
  shippingDistrict: z.string().min(1),
  shippingCity: z.string().min(1),
  shippingState: z.string().min(1),
  notes: z.string().nullable().optional(),
  subtotal: z.string(),
  shippingService: z.string().nullable().optional(),
  shippingAmount: z.string(),
  total: z.string(),
  items: z.array(orderItemSchema).min(1),
});

function generateOrderNumber(): string {
  return `PF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function ordersRouter(): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const parsed = orderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
    }
    const { items, ...orderFields } = parsed.data;
    const order = await createOrderWithItems(
      { ...orderFields, orderNumber: generateOrderNumber() },
      items
    );
    res.status(201).json({ orderNumber: order.orderNumber });
  });

  return router;
}
