import { ReceiptText, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function ReceiptScanner({ group, receipt, onExtract, onSave, isExtracting, isSaving }) {
  const [assignments, setAssignments] = useState({});
  const [paidBy, setPaidBy] = useState(group.members[0]?.id ?? "");

  useEffect(() => {
    setPaidBy((current) => (group.members.some((member) => member.id === current) ? current : (group.members[0]?.id ?? "")));
  }, [group.id]);

  useEffect(() => {
    if (!receipt) return;

    setAssignments(
      Object.fromEntries(
        receipt.items.map((item) => [
          item.name,
          group.members.map((member) => member.id)
        ])
      )
    );
  }, [receipt, group.id]);

  function toggleAssignee(itemName, userId) {
    setAssignments((current) => {
      const existing = current[itemName] ?? [];
      const next = existing.includes(userId) ? existing.filter((id) => id !== userId) : [...existing, userId];
      return {
        ...current,
        [itemName]: next.length ? next : [userId]
      };
    });
  }

  function saveReceipt() {
    if (!receipt) return;

    onSave({
      paidBy,
      receipt: {
        ...receipt,
        items: receipt.items.map((item) => ({
          ...item,
          assignedTo: assignments[item.name] ?? group.members.map((member) => member.id)
        }))
      }
    });
  }

  if (!receipt) {
    return (
      <button className="secondary-button" onClick={onExtract} disabled={isExtracting}>
        <ScanLine size={18} />
        {isExtracting ? "Extracting..." : "Run extractor"}
      </button>
    );
  }

  return (
    <div className="receipt-preview">
      <div>
        <strong>{receipt.merchant}</strong>
        <span>{Math.round(receipt.confidence * 100)}% confidence</span>
      </div>

      <label>
        Paid by
        <select value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>
          {group.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <div className="receipt-item-list">
        {receipt.items.map((item) => (
          <article key={item.name} className="receipt-item">
            <div className="receipt-item-heading">
              <span>
                <ReceiptText size={16} />
                {item.name}
              </span>
              <strong>{currency.format(item.price)}</strong>
            </div>
            <div className="assignee-grid">
              {group.members.map((member) => (
                <label key={member.id} className="assignee-pill">
                  <input
                    type="checkbox"
                    checked={(assignments[item.name] ?? []).includes(member.id)}
                    onChange={() => toggleAssignee(item.name, member.id)}
                  />
                  {member.name}
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <footer>Total {currency.format(receipt.total)}</footer>
      <button className="primary-button" onClick={saveReceipt} disabled={isSaving}>
        <ReceiptText size={18} />
        {isSaving ? "Saving..." : "Save item-wise expense"}
      </button>
    </div>
  );
}
