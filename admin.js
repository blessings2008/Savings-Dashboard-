import { db, ref, onValue } from "./firebase.js";

// ----------------------------
// YOUR ADMIN UID
// Replace this with your actual Firebase UID
// Find it in Firebase Console → Authentication → Users
// ----------------------------
export const ADMIN_UID = "kYDdHuSgdoX4UCeOS9ZHCrkZGEH2";

export function isAdmin(uid) {
  return uid === ADMIN_UID;
}

// ----------------------------
// RENDER ADMIN DASHBOARD
// ----------------------------

export function renderAdminDashboard(user, logOut) {
  const appEl = document.getElementById("app");

  appEl.innerHTML = `
    <div style="max-width:900px;margin:auto;padding:18px">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h1 style="font-size:22px;font-weight:700">Admin Dashboard</h1>
          <p style="font-size:12px;opacity:0.5;margin-top:4px">Money Saver Pro — All Users</p>
        </div>
        <button onclick="window.__logout__()" style="
          padding:10px 18px;
          border-radius:12px;
          border:1px solid rgba(255,255,255,0.15);
          background:transparent;
          color:white;
          font-size:13px;
          font-weight:600;
          cursor:pointer;
        ">Sign Out</button>
      </div>

      <div id="admin-stats" style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
        gap:12px;
        margin-bottom:20px;
      ">
        <div class="stat-card" style="background:#111827;padding:16px;border-radius:16px;border:0.5px solid rgba(255,255,255,0.07)">
          <span style="opacity:0.6;font-size:12px">Total Users</span>
          <strong id="stat-users" style="display:block;font-size:24px;margin-top:8px">—</strong>
        </div>
        <div class="stat-card" style="background:#111827;padding:16px;border-radius:16px;border:0.5px solid rgba(255,255,255,0.07)">
          <span style="opacity:0.6;font-size:12px">Total Transactions</span>
          <strong id="stat-transactions" style="display:block;font-size:24px;margin-top:8px">—</strong>
        </div>
        <div class="stat-card" style="background:#111827;padding:16px;border-radius:16px;border:0.5px solid rgba(255,255,255,0.07)">
          <span style="opacity:0.6;font-size:12px">Pending Transfers</span>
          <strong id="stat-pending" style="display:block;font-size:24px;margin-top:8px;color:#fbbf24">—</strong>
        </div>
        <div class="stat-card" style="background:#111827;padding:16px;border-radius:16px;border:0.5px solid rgba(255,255,255,0.07)">
          <span style="opacity:0.6;font-size:12px">Total Savings</span>
          <strong id="stat-savings" style="display:block;font-size:24px;margin-top:8px;color:#34d399">—</strong>
        </div>
      </div>

      <div style="margin-bottom:20px">
        <h2 style="font-size:15px;opacity:0.6;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">
          All Pending Transfers
        </h2>
        <div id="admin-pending">
          <p style="opacity:0.4;font-size:13px">Loading...</p>
        </div>
      </div>

      <div>
        <h2 style="font-size:15px;opacity:0.6;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">
          All Users & Transactions
        </h2>
        <div id="admin-users">
          <p style="opacity:0.4;font-size:13px">Loading...</p>
        </div>
      </div>

    </div>
  `;

  window.__logout__ = async () => {
    await logOut();
  };

  loadAdminData();
}

// ----------------------------
// LOAD ALL USER DATA
// ----------------------------

function loadAdminData() {
  const usersRef = ref(db, "users");

  onValue(usersRef, (snapshot) => {
    try {
      const allUsers = snapshot.val();

      if (!allUsers) {
        document.getElementById("admin-users").innerHTML =
          `<p style="opacity:0.4;font-size:13px">No users found.</p>`;
        document.getElementById("admin-pending").innerHTML =
          `<p style="opacity:0.4;font-size:13px">No pending transfers.</p>`;
        updateStats(0, 0, 0, 0);
        return;
      }

      const userEntries = Object.entries(allUsers);
      let totalTransactions = 0;
      let totalPending = 0;
      let totalSavings = 0;
      let allPendingTransfers = [];
      let usersHTML = "";

      userEntries.forEach(([uid, userData]) => {
        const transactions = userData.transactions
          ? Object.values(userData.transactions)
          : [];

        const pendingTransfers = userData.pending_transfers
          ? Object.entries(userData.pending_transfers)
          : [];

        const completedTransfers = userData.completed_transfers
          ? Object.values(userData.completed_transfers)
          : [];

        totalTransactions += transactions.length;
        totalPending += pendingTransfers.length;

        // Calculate savings for this user
        let userSavings = 0;
        pendingTransfers.forEach(([key, t]) => {
          userSavings += t.saveAmount || 0;
          allPendingTransfers.push({ uid, key, ...t });
        });
        completedTransfers.forEach(t => {
          userSavings += t.saveAmount || 0;
        });
        totalSavings += userSavings;

        // Build user card
        usersHTML += `
          <div style="
            background:#111827;
            border-radius:18px;
            border:0.5px solid rgba(255,255,255,0.07);
            padding:18px;
            margin-bottom:12px;
          ">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
              <div>
                <div style="font-size:15px;font-weight:600;margin-bottom:4px">UID: ${uid.slice(0, 12)}...</div>
                <div style="font-size:12px;opacity:0.5">${transactions.length} transactions · ${pendingTransfers.length} pending · MK ${userSavings.toLocaleString()} saved</div>
              </div>
              <div style="
                background:rgba(52,211,153,0.15);
                color:#34d399;
                font-size:11px;
                padding:4px 10px;
                border-radius:8px;
                font-weight:600;
              ">Active</div>
            </div>

            ${transactions.length > 0 ? `
              <div style="font-size:12px;opacity:0.5;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">
                Recent Transactions
              </div>
              ${transactions.slice(0, 3).map(t => `
                <div style="
                  background:#0b1220;
                  padding:12px;
                  border-radius:12px;
                  margin-bottom:6px;
                  font-size:13px;
                  opacity:0.8;
                  line-height:1.5;
                ">${t.message || "No message"}</div>
              `).join("")}
              ${transactions.length > 3 ? `
                <div style="font-size:12px;opacity:0.4;margin-top:6px">
                  + ${transactions.length - 3} more transactions
                </div>
              ` : ""}
            ` : `<div style="font-size:13px;opacity:0.4">No transactions yet</div>`}
          </div>
        `;
      });

      // Update stats
      updateStats(userEntries.length, totalTransactions, totalPending, totalSavings);

      // Render users
      document.getElementById("admin-users").innerHTML =
        usersHTML || `<p style="opacity:0.4;font-size:13px">No users found.</p>`;

      // Render pending transfers
      if (allPendingTransfers.length > 0) {
        document.getElementById("admin-pending").innerHTML = allPendingTransfers.map(t => `
          <div style="
            background:#111827;
            border-radius:16px;
            border:0.5px solid rgba(251,191,36,0.2);
            padding:16px;
            margin-bottom:10px;
          ">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <div>
                <div style="font-size:14px;font-weight:600">${t.sender || "Unknown"}</div>
                <div style="font-size:11px;opacity:0.5;margin-top:2px">TID: ${t.tid || "N/A"}</div>
                <div style="font-size:11px;opacity:0.5">UID: ${t.uid.slice(0, 12)}...</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:18px;font-weight:700;color:#fbbf24">MK ${(t.saveAmount || 0).toLocaleString()}</div>
                <div style="font-size:11px;opacity:0.5">${t.savingsPercent || 0}% of MK ${(t.amount || 0).toLocaleString()}</div>
              </div>
            </div>
            <div style="
              background:#0b1220;
              padding:10px;
              border-radius:10px;
              font-size:12px;
              opacity:0.6;
              line-height:1.5;
            ">${t.rawMessage || "No message"}</div>
            <div style="
              margin-top:10px;
              font-size:12px;
              color:#fbbf24;
              font-weight:600;
            ">⏳ Awaiting Macrodroid transfer</div>
          </div>
        `).join("");
      } else {
        document.getElementById("admin-pending").innerHTML =
          `<p style="opacity:0.4;font-size:13px">✅ No pending transfers.</p>`;
      }

    } catch (error) {
      console.error("Admin data load failed:", error);
    }
  });
}

// ----------------------------
// UPDATE STAT CARDS
// ----------------------------

function updateStats(users, transactions, pending, savings) {
  document.getElementById("stat-users").textContent = users;
  document.getElementById("stat-transactions").textContent = transactions;
  document.getElementById("stat-pending").textContent = pending;
  document.getElementById("stat-savings").textContent = `MK ${savings.toLocaleString()}`;
}
