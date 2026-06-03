import { db, push, ref, onValue, remove, update } from "./firebase.js";
import { saveOfflineTransaction, getOfflineTransactions } from "./storage.js";

// ----------------------------
// UTIL
// ----------------------------

function safeNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ----------------------------
// PARSER
// ----------------------------

function parseTransaction(message) {
  if (!message || typeof message !== "string") return null;

  const msg = message.toLowerCase();

  let network = "unknown";
  let type = "other";

  if (
    msg.includes("received mwk") ||
    msg.includes("has deposited") ||
    msg.includes("pp")
  ) {
    network = "airtel";
  } else if (msg.includes("mpamba") || msg.includes("tnm")) {
    network = "tnm";
  }

  if (msg.includes("betpawa") || msg.includes("premierbet")) type = "gambling";
  else if (msg.includes("airtime")) type = "airtime";
  else if (msg.includes("deposited") || msg.includes("received")) type = "income";
  else if (msg.includes("sent") || msg.includes("paid") || msg.includes("withdrawn")) type = "expense";

  const amountMatch = message.match(/(?:MK|MWK)\s?([\d,]+)/i);
  const amount = amountMatch ? safeNumber(amountMatch[1].replace(/,/g, "")) : 0;

  let sender = "System";
  const senderMatch =
    message.match(/^(.*?) has deposited/i) ||
    message.match(/from (.*?)\s\d+/i);
  if (senderMatch) sender = senderMatch[1].trim();

  const tidMatch = message.match(/([A-Z]{2}\d+\.\d+\.[A-Z0-9]+)/i);
  const tid = tidMatch ? tidMatch[1] : `NO_TID_${amount}_${Date.now()}`;

  let savingsPercent = 0;
  let saveAmount = 0;
  let savingsStatus = "denied";
  let requiresTransfer = false;

  if (type === "income" && amount > 0) {
    savingsPercent = amount > 20000 ? 25 : amount > 5000 ? 35 : 40;
    saveAmount = Math.floor(amount * (savingsPercent / 100));

    if (saveAmount >= 100) {
      savingsStatus = "approved";
      requiresTransfer = true;
    } else {
      savingsStatus = "pending";
      requiresTransfer = false;
    }
  }

  return {
    id: tid,
    network,
    type,
    amount,
    sender,
    tid,
    savingsPercent,
    saveAmount,
    savingsStatus,
    requiresTransfer,
    rawMessage: message,
    timestamp: Date.now(),
    processed: false
  };
}

// ----------------------------
// ANALYTICS
// ----------------------------

function analyze(transactions) {
  let income = 0;
  let expense = 0;
  let approvedSavings = 0;
  let pendingSavings = 0;
  let count = 0;
  let biggest = 0;
  let cards = [];
  const seen = new Set();

  for (const item of transactions) {
    const parsed = parseTransaction(item.message);
    if (!parsed) continue;
    if (seen.has(parsed.tid)) continue;
    seen.add(parsed.tid);

    count++;
    biggest = Math.max(biggest, parsed.amount);

    if (parsed.type === "income") {
      income += parsed.amount;
      if (parsed.savingsStatus === "approved") approvedSavings += parsed.saveAmount;
      if (parsed.savingsStatus === "pending") pendingSavings += parsed.saveAmount;
    }

    if (["expense", "gambling", "airtime"].includes(parsed.type)) {
      expense += parsed.amount;
    }

    cards.push(parsed);
  }

  return { income, expense, balance: income - expense, approvedSavings, pendingSavings, count, biggest, cards };
}

// ----------------------------
// PREDICTION
// ----------------------------

function predict(balance, income, expense) {
  const trend = income - expense;
  const projected = balance + trend * 7;
  const risk =
    projected < balance * 0.5 ? "HIGH RISK" :
    projected < balance ? "MEDIUM RISK" : "LOW RISK";
  return { projected, risk };
}

// ----------------------------
// RENDER
// ----------------------------

function renderDashboard(dataArray = []) {
  const data = analyze(dataArray);
  const prediction = predict(data.balance, data.income, data.expense);
  const savingsBalance = data.approvedSavings;

  let insight =
    prediction.risk === "HIGH RISK"
      ? "⚠ Your financial future is unstable based on spending pattern."
      : data.approvedSavings > data.expense
      ? "🔥 Strong saver. Your savings exceed your spending."
      : "📊 Stable but can improve savings consistency.";

  document.getElementById("app").innerHTML = `
    <div class="hero">
      <div class="hero-top">
        <h1>Money Saver Pro</h1>
        <p>Level 4 Full Financial Intelligence System - Auto-Approval Enabled</p>
      </div>

      <div class="balance-card">
        <span>Savings Balance</span>
        <h2>MK ${savingsBalance.toLocaleString()}</h2>
      </div>

      <div class="stats-grid">
        <div class="stat-card income">
          <span>Total Income</span>
          <strong>MK ${data.income.toLocaleString()}</strong>
        </div>
        <div class="stat-card expense">
          <span>Total Expenses</span>
          <strong>MK ${data.expense.toLocaleString()}</strong>
        </div>
        <div class="stat-card savings">
          <span>Auto-Approved Savings</span>
          <strong>MK ${data.approvedSavings.toLocaleString()}</strong>
        </div>
        <div class="stat-card pending">
          <span>Below Threshold</span>
          <strong>MK ${data.pendingSavings.toLocaleString()}</strong>
        </div>
      </div>

      <div class="insight-card">
        <h3>AI Insight</h3>
        <p>${insight}</p>
      </div>

      <div class="insight-card">
        <h3>Prediction</h3>
        <p>7-Day Forecast: MK ${prediction.projected.toLocaleString()}<br>Risk Level: ${prediction.risk}</p>
      </div>

      <div class="insight-card">
        <h3>Overview</h3>
        <p>Transactions: ${data.count}<br>Biggest Transaction: MK ${data.biggest.toLocaleString()}</p>
      </div>
    </div>

    <div class="transactions">
      ${data.cards.map(p => `
        <div class="card ${p.type}">
          <div class="card-top">
            <div>
              <div class="sender">${p.sender}</div>
              <div class="type">${p.type}</div>
            </div>
            <div class="amount">MK ${p.amount.toLocaleString()}</div>
          </div>
          <div class="meta-grid">
            <div class="meta-box">
              <span>Savings %</span>
              <strong>${p.savingsPercent}%</strong>
            </div>
            <div class="meta-box">
              <span>Savings</span>
              <strong>MK ${p.saveAmount.toLocaleString()}</strong>
            </div>
            <div class="meta-box">
              <span>Status</span>
              <strong class="${p.savingsStatus === 'approved' ? 'approved' : 'pending'}">${p.savingsStatus}</strong>
            </div>
          </div>
          <div class="raw-message">${p.rawMessage}</div>
          ${p.requiresTransfer ? `
            <div class="transfer-info" style="color:green;font-weight:bold;margin-top:10px;">
              ✅ Auto-Approved - Waiting for Macrodroid (MK ${p.saveAmount})
            </div>
          ` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

// ----------------------------
// FIREBASE: PENDING TRANSFERS
// ----------------------------

const pendingTransfersRef = ref(db, "pending_transfers");

onValue(pendingTransfersRef, (snapshot) => {
  try {
    const pendingTransfers = snapshot.val();
    if (pendingTransfers) {
      const transferArray = Object.entries(pendingTransfers).map(([key, transfer]) => ({
        id: key,
        tid: transfer.tid,
        amount: transfer.saveAmount,
        percentage: transfer.savingsPercent,
        sender: transfer.sender,
        originalAmount: transfer.amount,
        message: transfer.rawMessage,
        createdAt: transfer.createdAt,
        approvedAt: transfer.approvedAt,
        status: "pending",
        requiresProof: true
      }));
      console.log(`⏳ PENDING TRANSFERS:`, transferArray);
      transferArray.forEach((transfer, index) => {
        console.log(`${index + 1}. ✅ MK ${transfer.amount} | TID: ${transfer.tid} | FROM: ${transfer.sender}`);
      });
    } else {
      console.log("✅ No pending transfers!");
    }
  } catch (error) {
    console.error("Failed to load pending transfers:", error);
  }
});

// ----------------------------
// FIREBASE: ALL TRANSACTIONS
// ----------------------------

const transactionsRef = ref(db, "transactions");

onValue(transactionsRef, (snapshot) => {
  try {
    const data = snapshot.val();

    if (!data) {
      renderDashboard(getOfflineTransactions());
      return;
    }

    const transactions = Object.values(data);
    const existing = getOfflineTransactions();
    const existingIds = new Set(existing.map(x => x.tid || x.message));

    transactions.forEach(t => {
      const key = t.tid || t.message;

      if (!existingIds.has(key)) {
        saveOfflineTransaction(t);

        const parsed = parseTransaction(t.message);

        if (parsed && parsed.requiresTransfer) {
          push(ref(db, "pending_transfers"), {
            tid: parsed.tid,
            saveAmount: parsed.saveAmount,
            savingsPercent: parsed.savingsPercent,
            sender: parsed.sender,
            amount: parsed.amount,
            rawMessage: parsed.rawMessage,
            createdAt: Date.now(),
            approvedAt: Date.now(),
            approvedBy: "auto-system",
            status: "pending",
            requiresProof: true
          });
          console.log(`✅ AUTO-APPROVED: MK ${parsed.saveAmount} (TID: ${parsed.tid})`);
        }
      }
    });

    console.log(`📊 Total Transactions: ${transactions.length}`);
    renderDashboard(transactions);

  } catch (error) {
    console.error("Dashboard update failed:", error);
    renderDashboard(getOfflineTransactions());
  }
});

// ----------------------------
// FIREBASE: COMPLETION MESSAGES
// ----------------------------

const completionMessagesRef = ref(db, "completion_messages");

onValue(completionMessagesRef, (snapshot) => {
  try {
    const messages = snapshot.val();
    if (messages) {
      Object.entries(messages).forEach(([key, message]) => {
        if (message && !message.processed) {
          const { tid, successMessage, timestamp } = message;
          if (!successMessage || successMessage.trim().length === 0) {
            console.error(`❌ REJECTED: No proof for TID ${tid}`);
            return;
          }
          completeTransferWithProof(tid, successMessage, timestamp, key);
        }
      });
    }
  } catch (error) {
    console.error("Failed to process completion messages:", error);
  }
});

// ----------------------------
// COMPLETE TRANSFER WITH PROOF
// ----------------------------

async function completeTransferWithProof(tid, successMessage, macrodroidTimestamp, messageKey) {
  try {
    if (!successMessage || successMessage.trim().length === 0) {
      return { success: false, message: "No valid proof message" };
    }

    const pendingSnapshot = await new Promise((resolve) => {
      onValue(pendingTransfersRef, resolve, { onlyOnce: true });
    });

    const pendingData = pendingSnapshot.val();
    let transferKey = null;
    let transferData = null;

    if (pendingData) {
      Object.entries(pendingData).forEach(([key, transfer]) => {
        if (transfer.tid === tid) {
          transferKey = key;
          transferData = transfer;
        }
      });
    }

    if (!transferKey || !transferData) {
      update(ref(db, `completion_messages/${messageKey}`), {
        processed: true, processedAt: Date.now(), result: "failed"
      });
      return { success: false, message: "Transfer not found" };
    }

    await push(ref(db, "completed_transfers"), {
      ...transferData,
      completedAt: Date.now(),
      macrodroidCompletedAt: macrodroidTimestamp,
      completedBy: "macrodroid",
      status: "completed",
      proofMessage: successMessage,
      verified: true
    });

    await remove(ref(db, `pending_transfers/${transferKey}`));

    update(ref(db, `completion_messages/${messageKey}`), {
      processed: true, processedAt: Date.now(), result: "success"
    });

    return { success: true };

  } catch (error) {
    console.error("Error completing transfer:", error);
    return { success: false, error: error.message };
  }
}

// ----------------------------
// EXPORTS FOR MACRODROID
// ----------------------------

export async function getPendingTransfersForMacrodroid() {
  return new Promise((resolve, reject) => {
    onValue(pendingTransfersRef, (snapshot) => {
      const pendingTransfers = snapshot.val();
      if (pendingTransfers) {
        const transferArray = Object.entries(pendingTransfers).map(([key, transfer]) => ({
          id: key,
          tid: transfer.tid,
          amount: transfer.saveAmount,
          percentage: transfer.savingsPercent,
          sender: transfer.sender,
          originalAmount: transfer.amount,
          message: transfer.rawMessage,
          createdAt: transfer.createdAt,
          approvedAt: transfer.approvedAt,
          approvedBy: transfer.approvedBy,
          status: "pending",
          requiresProof: true
        }));
        resolve(transferArray);
      } else {
        resolve([]);
      }
    }, reject);
  });
}

export async function sendTransferCompletionMessage(tid, successMessage) {
  try {
    if (!successMessage || successMessage.trim().length === 0) {
      return { success: false, error: "Proof message is required" };
    }
    await push(ref(db, "completion_messages"), {
      tid,
      successMessage,
      timestamp: Date.now(),
      processed: false,
      requiresProof: true
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send completion message:", error);
    return { success: false, error: error.message };
  }
}

export async function completeTransferFromMacrodroid(tid, successMessage) {
  try {
    if (!successMessage || successMessage.trim().length === 0) {
      return { success: false, error: "Proof message is required" };
    }

    const pendingSnapshot = await new Promise((resolve) => {
      onValue(pendingTransfersRef, resolve, { onlyOnce: true });
    });

    const pendingData = pendingSnapshot.val();
    let transferKey = null;
    let transferData = null;

    if (pendingData) {
      Object.entries(pendingData).forEach(([key, transfer]) => {
        if (transfer.tid === tid) {
          transferKey = key;
          transferData = transfer;
        }
      });
    }

    if (!transferKey || !transferData) {
      return { success: false, message: "Transfer not found" };
    }

    await push(ref(db, "completed_transfers"), {
      ...transferData,
      completedAt: Date.now(),
      completedBy: "macrodroid",
      status: "completed",
      proofMessage: successMessage,
      verified: true
    });

    await remove(ref(db, `pending_transfers/${transferKey}`));

    return { success: true };
  } catch (error) {
    console.error("Macrodroid completion failed:", error);
    return { success: false, error: error.message };
  }
}
