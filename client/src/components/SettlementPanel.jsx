import { Banknote, Copy, CreditCard, Landmark, Smartphone, WalletCards } from "lucide-react";
import { useState } from "react";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function SettlementPanel({
  settlements,
  payments,
  onCreateUpi,
  onCreateRazorpay,
  onConfirmMockRazorpay,
  onMarkPaid,
  activePaymentKey,
  upiIntent,
  razorpayOrder
}) {
  const [copiedKey, setCopiedKey] = useState("");

  async function copyUpiIntent(key, upiIntent) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(upiIntent);
    }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(""), 1600);
  }

  return (
    <div className="settlement-workflow">
      <div className="settlement-list">
        {settlements.length ? (
          settlements.map((settlement) => {
            const key = settlementKey(settlement);
            return (
              <article key={key}>
                <div>
                  <strong>{settlement.fromUser.name}</strong>
                  <span>pays {settlement.toUser.name}</span>
                </div>
                <strong>{currency.format(settlement.amount)}</strong>
                <div className="settlement-actions" aria-label={`Payment methods for ${settlement.fromUser.name}`}>
                  <button className="payment-method-button" onClick={() => onCreateUpi(settlement)} type="button">
                    <Smartphone size={17} />
                    UPI
                  </button>
                  <button className="payment-method-button" onClick={() => onCreateRazorpay(settlement)} type="button">
                    <CreditCard size={17} />
                    Card
                  </button>
                  <button className="payment-method-button" onClick={() => onCreateRazorpay(settlement)} type="button">
                    <Landmark size={17} />
                    Netbanking
                  </button>
                  <button className="payment-method-button" onClick={() => onMarkPaid(settlement)} type="button">
                    <Banknote size={17} />
                    Cash
                  </button>
                </div>
                {activePaymentKey === key && upiIntent ? (
                  <button className="upi-link" type="button" onClick={() => copyUpiIntent(key, upiIntent)}>
                    <Copy size={16} />
                    {copiedKey === key ? "UPI link copied" : "Copy UPI intent"}
                  </button>
                ) : null}
                {activePaymentKey === key && razorpayOrder ? (
                  <div className="payment-provider-card">
                    <span>{razorpayOrder.provider === "mock" ? "Razorpay mock order" : "Razorpay checkout started"}</span>
                    <strong>{razorpayOrder.id}</strong>
                    {razorpayOrder.provider === "mock" ? (
                      <button className="payment-confirm-button" type="button" onClick={() => onConfirmMockRazorpay(settlement, razorpayOrder)}>
                        <WalletCards size={16} />
                        Complete mock online payment
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="empty-state">No settlements needed yet.</p>
        )}
      </div>

      <div className="payment-history">
        <strong>Payment history</strong>
        {payments.length ? (
          payments.slice(0, 5).map((payment) => (
            <p key={payment.id}>
              <span>
                {payment.fromUser.name} to {payment.toUser.name}
              </span>
              <span>
                {currency.format(payment.amount)} · {payment.status}
              </span>
            </p>
          ))
        ) : (
          <p className="muted-line">No settlement payments yet.</p>
        )}
      </div>
    </div>
  );
}

export function settlementKey(settlement) {
  return `${settlement.from}-${settlement.to}-${settlement.amount}`;
}
