import { CheckCircle2, Link as LinkIcon, WalletCards } from "lucide-react";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function SettlementPanel({ settlements, payments, onCreateUpi, onMarkPaid, activePaymentKey, upiIntent }) {
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
                <div className="settlement-actions">
                  <button className="icon-button" onClick={() => onCreateUpi(settlement)} aria-label={`Create UPI link for ${settlement.fromUser.name}`}>
                    <LinkIcon size={18} />
                  </button>
                  <button className="icon-button" onClick={() => onMarkPaid(settlement)} aria-label={`Mark paid by ${settlement.fromUser.name}`}>
                    <CheckCircle2 size={18} />
                  </button>
                </div>
                {activePaymentKey === key && upiIntent ? (
                  <a className="upi-link" href={upiIntent}>
                    <WalletCards size={16} />
                    Open UPI intent
                  </a>
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
