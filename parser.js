export function parseTransaction(message) {

  let network = "airtel";

  let type = "unknown";

  let amount = 0;

  let sender = "Unknown";

  let balance = 0;

  let tid = "Unknown";

  // -------------------------
  // NETWORK DETECTION
  // -------------------------

  if (
    /mpamba/i.test(message)
  ) {
    network = "tnm";
  }

  // -------------------------
  // AGENT DEPOSIT
  // -------------------------

  if (/has deposited/i.test(message)) {

    type = "income";

    const senderMatch =
      message.match(/^(.*?) has deposited/i);

    if (senderMatch) {
      sender = senderMatch[1].trim();
    }
  }

  // -------------------------
  // P2P RECEIVED
  // -------------------------

  else if (/Received/i.test(message)) {

    type = "income";

    const senderMatch =
      message.match(/from (.*?) \\d{10}/i);

    if (senderMatch) {
      sender = senderMatch[1].trim();
    }
  }

  // -------------------------
  // SENT MONEY
  // -------------------------

  else if (/sent/i.test(message)) {

    type = "expense";
  }

  // -------------------------
  // BETTING
  // -------------------------

  if (
    /betpawa|premierbet/i.test(message)
  ) {

    type = "gambling";
  }

  // -------------------------
  // AIRTIME
  // -------------------------

  if (/airtime/i.test(message)) {

    type = "airtime";
  }

  // -------------------------
  // AMOUNT EXTRACTION
  // -------------------------

  const amountMatch =
    message.match(
      /(?:MK|MWK)\s?([\d,]+(?:\.\d+)?)/i
    );

  if (amountMatch) {

    amount = Number(
      amountMatch[1].replace(/,/g, "")
    );
  }

  // -------------------------
  // BALANCE EXTRACTION
  // -------------------------

  const balanceMatch =
    message.match(
      /Bal:\s?MK\s?([\d,.]+)/i
    );

  if (balanceMatch) {

    balance = Number(
      balanceMatch[1].replace(/,/g, "")
    );
  }

  // -------------------------
  // TRANSACTION ID
  // -------------------------

  const tidMatch =
    message.match(
      /([A-Z]{2}\d+\.\d+\.[A-Z0-9]+)/i
    );

  if (tidMatch) {

    tid = tidMatch[1];
  }

  // -------------------------
  // SAVINGS LOGIC
  // -------------------------

  let saveAmount = 0;

  let shouldSave = false;

  // ONLY SAVE ON INCOME
  if (type === "income") {

    saveAmount =
      Math.floor(amount * 0.4);

    if (saveAmount >= 100) {

      shouldSave = true;
    }
  }

  return {

    network,

    type,

    amount,

    sender,

    balance,

    tid,

    saveAmount,

    shouldSave,

    status:
      shouldSave
        ? "ready_to_save"
        : "ignored",

    rawMessage: message
  };
}
