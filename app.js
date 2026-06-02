import { db, ref, onValue } from "./firebase.js";
import { saveOfflineTransaction, getOfflineTransactions } from "./storage.js";

const app = document.getElementById("app");

const API_BASE = "http://localhost:3000";

// ------------------------
// STATE
// ------------------------
let transactions = {};

// ------------------------
// FETCH FROM BACKEND (OPTIONAL SYNC)
// ------------------------
async function fetchTransactions() {
  try {
    const res = await fetch(`${API_BASE}/api/transactions`);
    transactions = await res.json();
    render(Object.values(transactions));
  } catch (err) {
    console.log("Backend offline, using Firebase only");
  }
}

// ------------------------
// RENDER
// ------------------------
function render(dataArray = []) {

  let income = 0;
  let expense = 0;
  let savings = 0;

  dataArray.forEach(t => {
    if (t.savingsStatus === "autoApproved") {
      savings += t.saveAmount || 0;
    }
  });

  app.innerHTML = `
    <header class="top">
      <h1>💰 Money Saver Pro</h1>
    </header>

    <section class="stats">
      <div>Transactions: ${dataArray.length}</div>
      <div>Approved Savings: MK ${savings.toLocaleString()}</div>
    </section>

    <section class="cards">
      ${dataArray.map(t => `
        <div class="card ${t.savingsStatus}">
          <div>MK ${t.amount}</div>
          <div>${t.savingsStatus}</div>
          <div>${t.message}</div>
        </div>
      `).join("")}
    </section>
  `;
}

// ------------------------
// FIREBASE LIVE SYNC
// ------------------------
const transactionsRef = ref(db, "transactions");

onValue(transactionsRef, (snapshot) => {
  const data = snapshot.val() || {};
  render(Object.values(data));
});

// ------------------------
// INIT
// ------------------------
fetchTransactions();

