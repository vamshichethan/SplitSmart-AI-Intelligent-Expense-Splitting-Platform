import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function ExpenseForm({ group, onSubmit, isSaving }) {
  const [form, setForm] = useState({
    title: "Cafe breakfast",
    amount: "1280",
    category: "Food",
    paidBy: group.members[0]?.id ?? "",
    splitMode: "equal"
  });
  const [memberSplits, setMemberSplits] = useState(() => buildDefaultSplits(group.members, "equal", 1280));
  const numericAmount = Number(form.amount || 0);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      paidBy: group.members.some((member) => member.id === current.paidBy) ? current.paidBy : (group.members[0]?.id ?? "")
    }));
    setMemberSplits(buildDefaultSplits(group.members, form.splitMode, numericAmount));
  }, [group.id]);

  const splitTotal = useMemo(() => {
    if (form.splitMode === "custom") {
      return sum(memberSplits.map((split) => Number(split.amount || 0)));
    }

    if (form.splitMode === "percentage") {
      return sum(memberSplits.map((split) => Number(split.percentage || 0)));
    }

    return numericAmount;
  }, [form.splitMode, memberSplits, numericAmount]);

  const splitHint =
    form.splitMode === "custom"
      ? `Custom total: ${formatMoney(splitTotal)}`
      : form.splitMode === "percentage"
        ? `Percentage total: ${splitTotal.toFixed(2)}%`
        : "Everyone shares this equally.";

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function updateMode(mode) {
    setForm((current) => ({ ...current, splitMode: mode }));
    setMemberSplits(buildDefaultSplits(group.members, mode, numericAmount));
  }

  function updateSplit(userId, field, value) {
    setMemberSplits((current) =>
      current.map((split) => (split.userId === userId ? { ...split, [field]: value } : split))
    );
  }

  function submit(event) {
    event.preventDefault();
    const splits =
      form.splitMode === "equal"
        ? undefined
        : memberSplits.map((split) => ({
            userId: split.userId,
            ...(form.splitMode === "custom" ? { amount: Number(split.amount || 0) } : { percentage: Number(split.percentage || 0) })
          }));

    onSubmit({
      ...form,
      amount: numericAmount,
      splits
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
        {["equal", "custom", "percentage"].map((mode) => (
          <button
            key={mode}
            type="button"
            className={form.splitMode === mode ? "active" : ""}
            onClick={() => updateMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="split-editor">
        <div className="split-editor-heading">
          <strong>Split details</strong>
          <span>{splitHint}</span>
        </div>
        {form.splitMode === "equal" ? (
          <div className="split-summary">
            {group.members.map((member) => (
              <span key={member.id}>
                {member.name}: {formatMoney(numericAmount / group.members.length)}
              </span>
            ))}
          </div>
        ) : (
          <div className="split-input-grid">
            {group.members.map((member) => {
              const split = memberSplits.find((item) => item.userId === member.id);
              return (
                <label key={member.id}>
                  {member.name}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.splitMode === "custom" ? (split?.amount ?? "") : (split?.percentage ?? "")}
                    onChange={(event) =>
                      updateSplit(member.id, form.splitMode === "custom" ? "amount" : "percentage", event.target.value)
                    }
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>
      <button className="primary-button" type="submit" disabled={isSaving}>
        <Plus size={18} />
        {isSaving ? "Adding..." : "Add expense"}
      </button>
    </form>
  );
}

function buildDefaultSplits(members, mode, amount) {
  if (!members.length) return [];

  if (mode === "custom") {
    const perMember = roundMoney(amount / members.length);
    return members.map((member, index) => ({
      userId: member.id,
      amount: index === members.length - 1 ? roundMoney(amount - perMember * (members.length - 1)) : perMember
    }));
  }

  if (mode === "percentage") {
    const perMember = roundMoney(100 / members.length);
    return members.map((member, index) => ({
      userId: member.id,
      percentage: index === members.length - 1 ? roundMoney(100 - perMember * (members.length - 1)) : perMember
    }));
  }

  return members.map((member) => ({ userId: member.id }));
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}
