import { NextResponse } from "next/server";
import { z } from "zod";

const order = z.object({
  coupon: z.string().max(40),
  viewportWidth: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10),
});

export async function POST(request: Request) {
  const parsed = order.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid test order" }, { status: 400 });
  const { coupon, viewportWidth } = parsed.data;

  // Intentionally seeded regression for the PARALLEL sample lab.
  // The same invalid coupon is handled correctly on desktop but crashes mobile checkout.
  if (coupon === "EXPIRED20" && viewportWidth <= 600) {
    return NextResponse.json({ error: "Coupon validation failed unexpectedly" }, { status: 500 });
  }
  if (coupon === "EXPIRED20") {
    return NextResponse.json({ error: "This coupon has expired." }, { status: 422 });
  }
  return NextResponse.json({ orderId: `TEST-${Date.now()}`, message: "Test order placed" });
}
