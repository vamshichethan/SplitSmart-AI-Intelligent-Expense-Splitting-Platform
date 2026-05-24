import {
  AlertCircle,
  Banknote,
  Bell,
  CircleDollarSign,
  LogOut,
  MessageSquareWarning,
  ReceiptText,
  Send,
  ScanLine,
  TrendingUp,
  Users,
  Wifi,
  WifiOff
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  addDisputeComment,
  addGroupMember,
  createExpense,
  createGroup,
  createReceiptExpense,
  createDispute,
  createRazorpayOrder,
  createUpiIntent,
  confirmRazorpayPayment,
  extractReceipt as extractReceiptFromApi,
  getAiInsights,
  getDashboard,
  markSettlementPaid,
  removeGroupMember,
  resolveDispute,
  sendExpenseReminders,
  subscribeToRealtime,
  uploadReceiptImage
} from "../services/api";
import { ExpenseForm } from "./ExpenseForm";
import { GroupManager } from "./GroupManager";
import { ReceiptScanner } from "./ReceiptScanner";
import { SettlementPanel, settlementKey } from "./SettlementPanel";
import { StatCard } from "./StatCard";
import { WorkflowPanel } from "./WorkflowPanel";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

export function Dashboard({ session, onLogout }) {
  const [data, setData] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [upiIntent, setUpiIntent] = useState("");
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  const [activePaymentKey, setActivePaymentKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGroupSaving, setIsGroupSaving] = useState(false);
  const [isReceiptSaving, setIsReceiptSaving] = useState(false);
  const [isReceiptUploading, setIsReceiptUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    refresh(selectedGroupId);
  }, [selectedGroupId]);

  useEffect(() => {
    if (!data?.activeGroup?.id) return undefined;

    return subscribeToRealtime(data.activeGroup.id, {
      onStatus: setRealtimeStatus,
      onEvent(event) {
        setLastRealtimeEvent(event.type.replace(":", " "));
        refresh(data.activeGroup.id);
      }
    });
  }, [data?.activeGroup?.id]);

  async function refresh(groupId = selectedGroupId) {
    try {
      setError("");
      const nextData = await getDashboard(groupId);
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function addExpense(payload) {
    setIsSaving(true);
    try {
      await createExpense(data.activeGroup.id, payload);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function saveGroup(payload) {
    setIsGroupSaving(true);
    try {
      const nextData = await createGroup(payload);
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsGroupSaving(false);
    }
  }

  async function saveMember(payload) {
    setIsGroupSaving(true);
    try {
      const nextData = await addGroupMember(data.activeGroup.id, payload);
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsGroupSaving(false);
    }
  }

  async function extractReceipt(receiptText = "") {
    setIsExtracting(true);
    try {
      setReceipt(await extractReceiptFromApi({ receiptText }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsExtracting(false);
    }
  }

  async function uploadReceipt(file) {
    setIsReceiptUploading(true);
    try {
      setError("");
      return await uploadReceiptImage(file);
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setIsReceiptUploading(false);
    }
  }

  async function removeMember(userId) {
    setIsGroupSaving(true);
    try {
      const nextData = await removeGroupMember(data.activeGroup.id, userId);
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsGroupSaving(false);
    }
  }

  async function saveReceiptExpense(payload) {
    setIsReceiptSaving(true);
    try {
      const nextData = await createReceiptExpense(data.activeGroup.id, payload);
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
      setReceipt(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsReceiptSaving(false);
    }
  }

  async function requestUpiIntent(settlement) {
    try {
      setError("");
      const response = await createUpiIntent(data.activeGroup.id, {
        from: settlement.from,
        to: settlement.to,
        amount: settlement.amount
      });
      setUpiIntent(response.upiIntent);
      setRazorpayOrder(null);
      setActivePaymentKey(settlementKey(settlement));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function requestRazorpayOrder(settlement) {
    try {
      setError("");
      const response = await createRazorpayOrder({
        amount: settlement.amount,
        receipt: `${data.activeGroup.id}_${settlement.from}_${settlement.to}_${Date.now()}`
      });
      setRazorpayOrder(response);
      setUpiIntent("");
      setActivePaymentKey(settlementKey(settlement));

      if (response.provider === "razorpay") {
        await openRazorpayCheckout(settlement, response);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function confirmMockRazorpayPayment(settlement, order) {
    try {
      setError("");
      const nextData = await confirmRazorpayPayment(data.activeGroup.id, {
        from: settlement.from,
        to: settlement.to,
        amount: settlement.amount,
        orderId: order.id,
        paymentId: `pay_mock_${Date.now()}`
      });
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
      setRazorpayOrder(null);
      setActivePaymentKey("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function openRazorpayCheckout(settlement, order) {
    await loadRazorpayCheckout();

    const payer = settlement.fromUser;
    const receiver = settlement.toUser;
    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency ?? "INR",
      name: "SplitSmart AI",
      description: `${payer.name} pays ${receiver.name}`,
      order_id: order.id,
      prefill: {
        name: payer.name,
        email: payer.email
      },
      notes: {
        groupId: data.activeGroup.id,
        from: settlement.from,
        to: settlement.to
      },
      theme: {
        color: "#0f766e"
      },
      handler: async (payment) => {
        try {
          const nextData = await confirmRazorpayPayment(data.activeGroup.id, {
            from: settlement.from,
            to: settlement.to,
            amount: settlement.amount,
            orderId: payment.razorpay_order_id,
            paymentId: payment.razorpay_payment_id,
            signature: payment.razorpay_signature
          });
          setData(nextData);
          setSelectedGroupId(nextData.activeGroup.id);
          setRazorpayOrder(null);
          setActivePaymentKey("");
        } catch (requestError) {
          setError(requestError.message);
        }
      },
      modal: {
        ondismiss: () => setError("Razorpay checkout was closed before payment completion.")
      }
    });

    checkout.open();
  }

  async function completeSettlement(settlement) {
    try {
      setError("");
      const nextData = await markSettlementPaid(data.activeGroup.id, {
        from: settlement.from,
        to: settlement.to,
        amount: settlement.amount
      });
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
      setUpiIntent("");
      setActivePaymentKey("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function remindExpense(expenseId) {
    try {
      setError("");
      const nextData = await sendExpenseReminders(expenseId);
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function disputeExpense(expense, reason = `Review requested for ${expense.title}.`) {
    try {
      setError("");
      const nextData = await createDispute(expense.id, {
        reason
      });
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function commentOnDispute(disputeId, message) {
    try {
      setError("");
      const nextData = await addDisputeComment(disputeId, { message });
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function finishDispute(disputeId, status, resolution) {
    try {
      setError("");
      const nextData = await resolveDispute(disputeId, { status, resolution });
      setData(nextData);
      setSelectedGroupId(nextData.activeGroup.id);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function refreshAiInsights() {
    try {
      setError("");
      setAiInsights(await getAiInsights(data.activeGroup.id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const totals = useMemo(() => {
    if (!data) return null;
    const spend = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const due = data.settlements.reduce((sum, settlement) => sum + settlement.amount, 0);
    return {
      spend,
      due,
      expenses: data.expenses.length,
      disputes: data.disputes.length
    };
  }, [data]);

  if (!data || !totals) {
    return (
      <main className="loading-screen">
        <ReceiptText size={32} />
        <span>Loading SplitSmart AI...</span>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">S</div>
          <div>
            <strong>SplitSmart AI</strong>
            <span>Expense intelligence</span>
          </div>
        </div>
        <nav>
          <a className="active" href="#overview">
            <TrendingUp size={18} />
            Overview
          </a>
          <a href="#groups">
            <Users size={18} />
            Groups
          </a>
          <a href="#expenses">
            <ReceiptText size={18} />
            Expenses
          </a>
          <a href="#settlements">
            <Banknote size={18} />
            Settlements
          </a>
          <a href="#scanner">
            <ScanLine size={18} />
            Scanner
          </a>
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p>{data.activeGroup.type} group</p>
            <h1>{data.activeGroup.name}</h1>
          </div>
          <div className="topbar-actions">
            <div className={`realtime-status ${realtimeStatus}`}>
              {realtimeStatus === "connected" ? <Wifi size={16} /> : <WifiOff size={16} />}
              <div>
                <strong>{realtimeStatus === "connected" ? "Live sync" : "Syncing"}</strong>
                <p>{lastRealtimeEvent || "Realtime ready"}</p>
              </div>
            </div>
            <div className="current-user">
              <span>{session?.user?.avatar ?? data.currentUser.avatar}</span>
              <div>
                <strong>{session?.user?.name ?? data.currentUser.name}</strong>
                <p>Signed in</p>
              </div>
            </div>
            <div className="member-stack">
              {data.activeGroup.members.map((member) => (
                <span key={member.id} title={member.name}>
                  {member.avatar}
                </span>
              ))}
            </div>
            <button className="icon-button" onClick={onLogout} aria-label="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        <section id="overview" className="stats-grid">
          <StatCard icon={CircleDollarSign} label="Group spend" value={currency.format(totals.spend)} hint="Active group total" />
          <StatCard icon={Banknote} label="Pending dues" value={currency.format(totals.due)} hint="After simplification" />
          <StatCard icon={ReceiptText} label="Expenses" value={totals.expenses} hint="Tracked this cycle" />
          <StatCard icon={AlertCircle} label="Disputes" value={totals.disputes} hint="Needs admin action" />
        </section>

        <section className="content-grid">
          <div className="panel wide" id="groups">
            <div className="panel-heading">
              <div>
                <p>Group workspace</p>
                <h2>Switch, create, and manage members</h2>
              </div>
            </div>
            <GroupManager
              groups={data.groups}
              activeGroupId={data.activeGroup.id}
              users={data.users}
              onSelectGroup={setSelectedGroupId}
              onCreateGroup={saveGroup}
              onAddMember={saveMember}
              onRemoveMember={removeMember}
              currentUserId={data.currentUser.id}
              isSaving={isGroupSaving}
            />
          </div>

          <div className="panel wide" id="expenses">
            <div className="panel-heading">
              <div>
                <p>Expense flow</p>
                <h2>Add and review expenses</h2>
              </div>
            </div>
            <ExpenseForm group={data.activeGroup} onSubmit={addExpense} isSaving={isSaving} />
            <div className="expense-list">
              {data.expenses.length ? data.expenses.map((expense) => (
                <article key={expense.id} className="expense-row">
                  <div className="expense-leading">
                    <span>{expense.category.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <strong>{expense.title}</strong>
                      <p>
                        Paid by {expense.payer.name} · {expense.date}
                      </p>
                    </div>
                  </div>
                  <div className="expense-amount">
                    <strong>{currency.format(expense.amount)}</strong>
                    <span>{expense.splitMode ?? "equal"} split · {expense.status.replace("_", " ")}</span>
                    <div className="row-actions">
                      <button className="icon-button" onClick={() => remindExpense(expense.id)} aria-label={`Send reminders for ${expense.title}`}>
                        <Send size={16} />
                      </button>
                      <button className="icon-button" onClick={() => disputeExpense(expense)} aria-label={`Raise dispute for ${expense.title}`}>
                        <MessageSquareWarning size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              )) : <p className="empty-state">No expenses in this group yet.</p>}
            </div>
          </div>

          <div className="panel" id="settlements">
            <div className="panel-heading">
              <div>
                <p>Graph engine</p>
                <h2>Settlements</h2>
              </div>
            </div>
            <SettlementPanel
              settlements={data.settlements}
              payments={data.payments}
              onCreateUpi={requestUpiIntent}
              onCreateRazorpay={requestRazorpayOrder}
              onConfirmMockRazorpay={confirmMockRazorpayPayment}
              onMarkPaid={completeSettlement}
              activePaymentKey={activePaymentKey}
              upiIntent={upiIntent}
              razorpayOrder={razorpayOrder}
            />
          </div>

          <div className="panel" id="scanner">
            <div className="panel-heading">
              <div>
                <p>Receipt scanner</p>
                <h2>Item-wise extraction</h2>
              </div>
              <button className="icon-button" onClick={() => extractReceipt()} aria-label="Extract receipt">
                <ScanLine size={18} />
              </button>
            </div>
            <ReceiptScanner
              group={data.activeGroup}
              receipt={receipt}
              onUpload={uploadReceipt}
              onExtract={extractReceipt}
              onSave={saveReceiptExpense}
              isUploading={isReceiptUploading}
              isExtracting={isExtracting}
              isSaving={isReceiptSaving}
            />
          </div>

          <div className="panel wide">
            <div className="panel-heading">
              <div>
                <p>Analytics</p>
                <h2>Spending patterns</h2>
              </div>
            </div>
            <div className="analytics-grid">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={data.analytics.categorySpend}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip formatter={(value) => currency.format(value)} />
                  <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={data.analytics.categorySpend} dataKey="value" nameKey="name" outerRadius={82} fill="#f59e0b" label />
                  <Tooltip formatter={(value) => currency.format(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="analytics-metrics">
              <article>
                <span>Top payer</span>
                <strong>{data.analytics.topSpender?.name ?? "None"}</strong>
                <p>{currency.format(data.analytics.topSpender?.amount ?? 0)}</p>
              </article>
              <article>
                <span>Completed settlements</span>
                <strong>{data.analytics.totals.completedSettlements}</strong>
                <p>{data.analytics.totals.pendingPaymentLinks} pending links</p>
              </article>
              <article>
                <span>Tracked spend</span>
                <strong>{currency.format(data.analytics.totals.totalSpend)}</strong>
                <p>{data.analytics.totals.expenseCount} expenses</p>
              </article>
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p>AI insights</p>
                <h2>Signals</h2>
              </div>
              <button className="icon-button" onClick={refreshAiInsights} aria-label="Refresh AI insights">
                <Bell size={18} />
              </button>
            </div>
            <div className="insight-list">
              {(aiInsights?.insights ?? data.analytics.insights).map((insight) => (
                <p key={insight}>{insight}</p>
              ))}
            </div>
            {aiInsights ? <p className="provider-line">Provider: {aiInsights.provider}</p> : null}
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p>Operations</p>
                <h2>Reminders and disputes</h2>
              </div>
              <MessageSquareWarning size={18} />
            </div>
            <WorkflowPanel
              notifications={data.notifications}
              disputes={data.disputes}
              expenses={data.expenses}
              onSendReminder={remindExpense}
              onCreateDispute={disputeExpense}
              onAddComment={commentOnDispute}
              onResolveDispute={finishDispute}
            />
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p>Members</p>
                <h2>Balances</h2>
              </div>
              <Users size={18} />
            </div>
            <div className="balance-list">
              {data.balances.map((balance) => (
                <article key={balance.userId}>
                  <span>{balance.user.avatar}</span>
                  <div>
                    <strong>{balance.user.name}</strong>
                    <p className={balance.amount >= 0 ? "positive" : "negative"}>{currency.format(balance.amount)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
