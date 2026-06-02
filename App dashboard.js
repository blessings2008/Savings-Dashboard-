import { push } from "./firebase.js";
import { db, ref, onValue, update } from "./firebase.js";
import { saveOfflineTransaction, getOfflineTransactions } from "./storage.js";

const app = document.getElementById("app");

// ----------------------------
// UTIL
// ----------------------------

function safeNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function uid(item) {
  return item?.tid || item?.id || item?.message || JSON.stringify(item);
}

// ----------------------------
// PARSER (FIXED + UPGRADED)
// ----------------------------

function parseTransaction(message) {
  if (!message || typeof message !== "string") return null;

  const msg = message.toLowerCase();

  let network = "unknown";
  let type = "other";

  // NETWORK DETECTION
  if (
    msg.includes("received mwk") ||
    msg.includes("has deposited") ||
    msg.includes("pp")
  ) {
    network = "airtel";
  } else if (
    msg.includes("mpamba") ||
    msg.includes("tnm")
  ) {
    network = "tnm";
  }

  // TYPE DETECTION
  if (msg.includes("betpawa") || msg.includes("premierbet")) type = "gambling";
  else if (msg.includes("airtime")) type = "airtime";
  else if (msg.includes("deposited") || msg.includes("received")) type = "income";
  else if (msg.includes("sent") || msg.includes("paid") || msg.includes("withdrawn")) type = "expense";

  // AMOUNT EXTRACTION
  const amountMatch = message.match(/(?:MK|MWK)\s?([\d,]+)/i);
  const amount = amountMatch ? safeNumber(amountMatch[1].replace(/,/g, "")) : 0;

  // SENDER EXTRACTION
  let sender = "System";
  const senderMatch =
    message.match(/^(.*?) has deposited/i) ||
    message.match(/from (.*?)\s\d+/i);

  if (senderMatch) sender = senderMatch[1].trim();

  // TID EXTRACTION
  const tidMatch = message.match(/([A-Z]{2}\d+\.\d+\.[A-Z0-9]+)/i);
  const tid = tidMatch ? tidMatch[1] : `NO_TID_${amount}_${Date.now()}`;

  // ----------------------------
  // SAVINGS ENGINE (RESTORED + FIXED)
  // ----------------------------

  let savingsPercent = 0;
  let saveAmount = 0;
  let savingsStatus = "denied";
  let requiresTransfer = false;

  if (type === "income" && amount > 0) {
    savingsPercent = amount > 20000 ? 25 : amount > 5000 ? 35 : 40;
    saveAmount = Math.floor(amount * (savingsPercent / 100));

    if (saveAmount >= 100) {
      savingsStatus = "approved";
      requiresTransfer = true; // TRANSFERS NEEDED FOR APPROVED SAVINGS
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
// ANALYTICS ENGINE (FIXED)
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

    // PREVENT DUPLICATES
    if (seen.has(parsed.tid)) continue;
    seen.add(parsed.tid);

    count++;
    biggest = Math.max(biggest, parsed.amount);

    if (parsed.type === "income") {
      income += parsed.amount;

      if (parsed.savingsStatus === "approved") {
        approvedSavings += parsed.saveAmount;
      }

      if (parsed.savingsStatus === "pending") {
        pendingSavings += parsed.saveAmount;
      }
    }

    if (["expense", "gambling", "airtime"].includes(parsed.type)) {
      expense += parsed.amount;
    }

    cards.push(parsed);
  }

  const balance = income - expense;

  return {
    income,
    expense,
    balance,
    approvedSavings,
    pendingSavings,
    count,
    biggest,
    cards
  };
}

// ----------------------------
// TRANSFER FILTER (NEW - ONLY KEEP PENDING TRANSFERS)
// ----------------------------

function filterPendingTransfers(transactions) {
  return transactions.filter(transaction => {
    const parsed = parseTransaction(transaction.message);
    return parsed && parsed.requiresTransfer && !parsed.processed;
  });
}

// ----------------------------
// PREDICTION ENGINE
// ----------------------------

function predict(balance, income, expense) {
  const trend = income - expense;
  const projected = balance + (trend * 7);

  let risk =
    projected < balance * 0.5
      ? "HIGH RISK"
      : projected < balance
      ? "MEDIUM RISK"
      : "LOW RISK";

  return { projected, risk };
}

// ----------------------------
// RENDER (FULL RESTORED DASHBOARD)
// ----------------------------

function renderDashboard(dataArray = []) {
  const data = analyze(dataArray);
  const prediction = predict(data.balance, data.income, data.expense);
  const savingsBalance = data.approvedSavings;

  let insight = "";

  if (prediction.risk === "HIGH RISK") {
    insight = "⚠ Your financial future is unstable based on spending pattern.";
  } else if (data.approvedSavings > data.expense) {
    insight = "🔥 Strong saver. Your savings exceed your spending.";
  } else {
    insight = "📊 Stable but can improve savings consistency.";
  }

  app.innerHTML = `
    <div class="hero">

      <div class="hero-top">
        <h1>Money Saver Pro</h1>
        <p>Level 4 Full Financial Intelligence System</p>
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
          <span>Approved Savings</span>
          <strong>MK ${data.approvedSavings.toLocaleString()}</strong>
        </div>

        <div class="stat-card pending">
          <span>Pending Savings</span>
          <strong>MK ${data.pendingSavings.toLocaleString()}</strong>
        </div>

      </div>

      <div class="insight-card">
        <h3>AI Insight</h3>
        <p>${insight}</p>
      </div>

      <div class="insight-card">
        <h3>Prediction</h3>
        <p>
          7-Day Forecast: MK ${prediction.projected.toLocaleString()} <br>
          Risk Level: ${prediction.risk}
        </p>
      </div>

      <div class="insight-card">
        <h3>Overview</h3>
        <p>
          Transactions: ${data.count} <br>
          Biggest Transaction: MK ${data.biggest.toLocaleString()}
        </p>
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

            <div class="amount">
              MK ${p.amount.toLocaleString()}
            </div>
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

          <div class="raw-message">
            ${p.rawMessage}
          </div>

          ${p.requiresTransfer ? `
            <button class="transfer-btn" data-tid="${p.tid}">
              Transfer MK ${p.saveAmount.toLocaleString()}
            </button>
          ` : ""}

        </div>
      `).join("")}

    </div>
  `;

  // ATTACH TRANSFER EVENT LISTENERS
  attachTransferListeners();
}

// ----------------------------
// TRANSFER HANDLER (NEW)
// ----------------------------

async function handleTransfer(tid, saveAmount) {
  try {
    // Update transaction as processed in database
    const transactionsRef = ref(db, "transactions");
    const updates = {};
    updates[`${tid}/processed`] = true;

    await update(transactionsRef, updates);

    // Log transfer in separate transfers table
    const transfersRef = ref(db, "transfers_completed");
    await push(transfersRef, {
      tid,
      amount: saveAmount,
      timestamp: Date.now(),
      status: "completed"
    });

    alert(`Transfer of MK ${saveAmount.toLocaleString()} completed!`);
  } catch (error) {
    console.error("Transfer failed:", error);
    alert("Transfer failed. Please try again.");
  }
}

function attachTransferListeners() {
  const transferButtons = document.querySelectorAll(".transfer-btn");
  transferButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tid = btn.getAttribute("data-tid");
      const amount = btn.textContent.match(/\d+/g).join("");
      handleTransfer(tid, amount);
    });
  });
}

// ----------------------------
// FIREBASE INTEGRATION (FIXED + OPTIMIZED)
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

    const existingIds = new Set(
      existing.map(x => x.tid || x.message)
    );

    transactions.forEach(t => {
      const key = t.tid || t.message;

      if (!existingIds.has(key)) {
        saveOfflineTransaction(t);
      }
    });

    // FILTER: ONLY KEEP TRANSACTIONS THAT REQUIRE TRANSFERS
    const pendingTransfers = filterPendingTransfers(transactions);

    // Keep all transactions in DB for analytics, but flag only pending transfers
    console.log(`📊 Total Transactions: ${transactions.length}`);
    console.log(`⏳ Pending Transfers: ${pendingTransfers.length}`);

    // Render with all transactions (for analytics) but highlight pending transfers
    renderDashboard(transactions);

  } catch (error) {
    console.error("Dashboard update failed:", error);
    renderDashboard(getOfflineTransactions());
  }
});

// ----------------------------
// CLEANUP: AUTO-ARCHIVE PROCESSED TRANSFERS (OPTIONAL)
// ----------------------------

async function cleanupProcessedTransfers() {
  try {
    const snapshot = await onValue(transactionsRef, (snap) => {
      const allTransactions = snap.val();

      if (allTransactions) {
        Object.entries(allTransactions).forEach(([key, transaction]) => {
          // Remove processed transactions after 7 days
          if (transaction.processed) {
            const ageInDays = (Date.now() - transaction.timestamp) / (1000 * 60 * 60 * 24);
            if (ageInDays > 7) {
              // Archive instead of delete
              const archiveRef = ref(db, `archives/${key}`);
              push(archiveRef, transaction);

              // Then remove from active transactions
              update(transactionsRef, { [key]: null });
            }
          }
        });
      }
    });
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

// Run cleanup every hour
setInterval(cleanupProcessedTransfers, 60 * 60 * 1000);