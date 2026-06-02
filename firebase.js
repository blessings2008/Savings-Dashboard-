import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {

  databaseURL:
  "https://money-saver-e0504-default-rtdb.firebaseio.com"

};

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

export {
  db,
  ref,
  onValue
};
