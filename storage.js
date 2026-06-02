export function saveOfflineTransaction(transaction) {

  const existing = JSON.parse(

    localStorage.getItem(
      "transactions"
    ) || "[]"

  );

  existing.unshift(transaction);

  localStorage.setItem(

    "transactions",

    JSON.stringify(existing)

  );
}

// ----------------------------

export function getOfflineTransactions() {

  return JSON.parse(

    localStorage.getItem(
      "transactions"
    ) || "[]"

  );
}

// ----------------------------

export function clearOfflineTransactions() {

  localStorage.removeItem(
    "transactions"
  );
}
