import { CheckCircle2, MessageCircle, MessageSquareWarning, Send } from "lucide-react";
import { useState } from "react";

export function WorkflowPanel({ notifications, disputes, expenses, onSendReminder, onCreateDispute, onAddComment, onResolveDispute }) {
  const [resolutionText, setResolutionText] = useState("Adjusted after admin review.");
  const [reminderExpenseId, setReminderExpenseId] = useState(expenses[0]?.id ?? "");
  const [disputeExpenseId, setDisputeExpenseId] = useState(expenses[0]?.id ?? "");
  const [disputeReason, setDisputeReason] = useState("");
  const [commentText, setCommentText] = useState({});
  const selectedReminderId = expenses.some((expense) => expense.id === reminderExpenseId) ? reminderExpenseId : (expenses[0]?.id ?? "");
  const selectedDispute = expenses.find((expense) => expense.id === disputeExpenseId) ?? expenses[0];

  function submitReminder(event) {
    event.preventDefault();
    if (selectedReminderId) onSendReminder(selectedReminderId);
  }

  function submitDispute(event) {
    event.preventDefault();
    if (!selectedDispute || disputeReason.trim().length < 5) return;
    onCreateDispute(selectedDispute, disputeReason.trim());
    setDisputeReason("");
  }

  function submitComment(event, disputeId) {
    event.preventDefault();
    const message = commentText[disputeId]?.trim();
    if (!message) return;
    onAddComment(disputeId, message);
    setCommentText((current) => ({ ...current, [disputeId]: "" }));
  }

  return (
    <div className="workflow-stack">
      <section className="workflow-section">
        <div className="workflow-heading">
          <Send size={18} />
          <strong>Reminder log</strong>
        </div>
        <form className="operation-form" onSubmit={submitReminder}>
          <label>
            Expense
            <select value={selectedReminderId} onChange={(event) => setReminderExpenseId(event.target.value)} disabled={!expenses.length}>
              {expenses.length ? (
                expenses.map((expense) => (
                  <option key={expense.id} value={expense.id}>
                    {expense.title}
                  </option>
                ))
              ) : (
                <option>Add an expense first</option>
              )}
            </select>
          </label>
          <button className="icon-button" type="submit" aria-label="Send reminder" disabled={!expenses.length}>
            <Send size={17} />
          </button>
        </form>
        {notifications.length ? (
          notifications.slice(0, 5).map((notification) => (
            <p key={notification.id}>
              <span>{notification.message}</span>
              <small>{notification.status}{notification.provider ? ` · ${notification.provider}` : ""}</small>
            </p>
          ))
        ) : (
          <p className="muted-line">No reminders sent yet.</p>
        )}
      </section>

      <section className="workflow-section">
        <div className="workflow-heading">
          <MessageSquareWarning size={18} />
          <strong>Disputes</strong>
        </div>
        <form className="operation-form dispute-create-form" onSubmit={submitDispute}>
          <label>
            Expense
            <select value={selectedDispute?.id ?? ""} onChange={(event) => setDisputeExpenseId(event.target.value)} disabled={!expenses.length}>
              {expenses.length ? (
                expenses.map((expense) => (
                  <option key={expense.id} value={expense.id}>
                    {expense.title}
                  </option>
                ))
              ) : (
                <option>Add an expense first</option>
              )}
            </select>
          </label>
          <label>
            Reason
            <input
              value={disputeReason}
              onChange={(event) => setDisputeReason(event.target.value)}
              placeholder="Type what is wrong with this expense"
              disabled={!expenses.length}
            />
          </label>
          <button className="icon-button" type="submit" aria-label="Raise dispute" disabled={!selectedDispute || disputeReason.trim().length < 5}>
            <MessageSquareWarning size={17} />
          </button>
        </form>
        {disputes.length ? (
          disputes.map((dispute) => (
            <article key={dispute.id} className="dispute-card">
              <div>
                <strong>{dispute.expense?.title ?? "Expense"}</strong>
                <span>{dispute.status.replace("_", " ")}</span>
              </div>
              <p>{dispute.reason}</p>
              {dispute.comments?.length ? (
                <div className="comment-thread">
                  {dispute.comments.map((comment) => (
                    <small key={comment.id}>
                      {comment.user.name}: {comment.message}
                    </small>
                  ))}
                </div>
              ) : null}
              <form className="dispute-actions" onSubmit={(event) => submitComment(event, dispute.id)}>
                <input
                  value={commentText[dispute.id] ?? ""}
                  onChange={(event) => setCommentText((current) => ({ ...current, [dispute.id]: event.target.value }))}
                  placeholder="Add a comment"
                />
                <button className="icon-button" type="submit" aria-label="Add dispute comment" disabled={!commentText[dispute.id]?.trim()}>
                  <MessageCircle size={18} />
                </button>
              </form>
              {["pending", "under_review"].includes(dispute.status) ? (
                <div className="dispute-actions">
                  <input value={resolutionText} onChange={(event) => setResolutionText(event.target.value)} />
                  <button className="icon-button" onClick={() => onResolveDispute(dispute.id, "resolved", resolutionText)} aria-label="Resolve dispute">
                    <CheckCircle2 size={18} />
                  </button>
                </div>
              ) : (
                <small>{dispute.resolution}</small>
              )}
            </article>
          ))
        ) : (
          <p className="muted-line">No active disputes.</p>
        )}
      </section>
    </div>
  );
}
