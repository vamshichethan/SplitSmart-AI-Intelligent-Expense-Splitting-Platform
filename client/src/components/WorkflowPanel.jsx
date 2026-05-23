import { CheckCircle2, MessageSquareWarning, Send } from "lucide-react";
import { useState } from "react";

export function WorkflowPanel({ notifications, disputes, onResolveDispute }) {
  const [resolutionText, setResolutionText] = useState("Adjusted after admin review.");

  return (
    <div className="workflow-stack">
      <section className="workflow-section">
        <div className="workflow-heading">
          <Send size={18} />
          <strong>Reminder log</strong>
        </div>
        {notifications.length ? (
          notifications.slice(0, 5).map((notification) => (
            <p key={notification.id}>
              <span>{notification.message}</span>
              <small>{notification.status}</small>
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
        {disputes.length ? (
          disputes.map((dispute) => (
            <article key={dispute.id} className="dispute-card">
              <div>
                <strong>{dispute.expense?.title ?? "Expense"}</strong>
                <span>{dispute.status.replace("_", " ")}</span>
              </div>
              <p>{dispute.reason}</p>
              {dispute.comments?.length ? <small>{dispute.comments.length} comment thread</small> : null}
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
