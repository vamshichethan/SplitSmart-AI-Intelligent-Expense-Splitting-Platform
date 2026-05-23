import { Plus } from "lucide-react";
import { useState } from "react";

export function ExpenseForm({ group, onSubmit, isSaving }) {
  const [form, setForm] = useState({
    title: "Cafe breakfast",
    amount: "1280",
    category: "Food",
    paidBy: group.members[0]?.id ?? "",
    splitMode: "equal"
  });

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      amount: Number(form.amount)
    });
  }

  return (
    <form className="expense-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Title
          <input name="title" value={form.title} onChange={updateField} />
        </label>
        <label>
          Amount
          <input name="amount" type="number" min="1" value={form.amount} onChange={updateField} />
        </label>
        <label>
          Category
          <select name="category" value={form.category} onChange={updateField}>
            <option>Food</option>
            <option>Travel</option>
            <option>Rent</option>
            <option>Subscriptions</option>
            <option>Shopping</option>
          </select>
        </label>
        <label>
          Paid by
          <select name="paidBy" value={form.paidBy} onChange={updateField}>
            {group.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="segmented-control" aria-label="Split mode">
        {["equal", "custom"].map((mode) => (
          <button
            key={mode}
            type="button"
            className={form.splitMode === mode ? "active" : ""}
            onClick={() => setForm((current) => ({ ...current, splitMode: mode }))}
          >
            {mode}
          </button>
        ))}
      </div>
      <button className="primary-button" type="submit" disabled={isSaving}>
        <Plus size={18} />
        {isSaving ? "Adding..." : "Add expense"}
      </button>
    </form>
  );
}
