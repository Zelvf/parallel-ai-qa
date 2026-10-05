"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FlaskConical,
  Package,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import Link from "next/link";

export default function CheckoutLab() {
  const [quantity, setQuantity] = useState(0);
  const [coupon, setCoupon] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    setResult("");
    try {
      const response = await fetch("/api/lab/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coupon, viewportWidth: window.innerWidth, quantity }),
      });
      const data = await response.json();
      setResult(
        response.ok
          ? data.message
          : response.status >= 500
            ? "Something went wrong. Please try again."
            : data.error,
      );
    } catch {
      setResult("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="lab-page">
      <div className="lab-topbar">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> Back to PARALLEL
        </Link>
        <span className="lab-tag">
          <FlaskConical size={14} /> SAFE TEST ENVIRONMENT
        </span>
      </div>
      <div className="lab-shell">
        <div className="lab-heading">
          <div className="lab-eyebrow">THE SAMPLE STORE / CHECKOUT</div>
          <h1>
            Small cart.
            <br />
            <em>Hidden fault.</em>
          </h1>
          <p>
            This synthetic store contains a seeded mobile checkout bug. No payment or real order is
            created.
          </p>
        </div>
        <div className="lab-grid">
          <section className="product-panel">
            <div className="product-art">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-cube">
                <Package size={76} strokeWidth={1.2} />
              </div>
              <span className="art-index">OBJECT / 001</span>
            </div>
            <div className="product-details">
              <div>
                <span className="micro-label">DIGITAL GOODS</span>
                <h2>Signal Kit</h2>
                <p>A sample product for the browser testing lab.</p>
              </div>
              <div className="product-price">$24.00</div>
            </div>
            <button className="lab-add" onClick={() => setQuantity((n) => n + 1)}>
              <ShoppingBag size={18} /> Add to cart <ArrowRight size={17} />
            </button>
          </section>
          <section className="checkout-panel">
            <div className="checkout-title">
              <span className="checkout-icon">
                <ShoppingBag size={18} />
              </span>
              <div>
                <span className="micro-label">STEP 02 / 02</span>
                <h2>Checkout</h2>
              </div>
            </div>
            <div className="order-line">
              <div>
                <strong>Signal Kit</strong>
                <span>Quantity {quantity}</span>
              </div>
              <strong>${(quantity * 24).toFixed(2)}</strong>
            </div>
            <div className="divider" />
            <label htmlFor="coupon" className="field-label">
              <Ticket size={16} /> Coupon code
            </label>
            <input
              id="coupon"
              value={coupon}
              onChange={(event) => setCoupon(event.target.value)}
              placeholder="Try EXPIRED20"
              autoComplete="off"
            />
            <div className="hint">
              The agent will test the expired coupon across browser profiles.
            </div>
            <div className="divider" />
            <div className="total-row">
              <span>Total</span>
              <strong>${(quantity * 24).toFixed(2)}</strong>
            </div>
            <button className="place-order" disabled={!quantity || loading} onClick={checkout}>
              {loading ? "Processing…" : "Place test order"}
              <ArrowRight size={17} />
            </button>
            {result && (
              <div
                role="status"
                className={`checkout-result ${result.includes("wrong") ? "result-error" : ""}`}
              >
                {result.includes("placed") ? <Check size={18} /> : null}
                {result}
              </div>
            )}
            <p className="checkout-foot">Test checkout only · no payment details required</p>
          </section>
        </div>
      </div>
    </main>
  );
}
