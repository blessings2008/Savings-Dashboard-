import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

// ----------------------------
// RENDER LOGIN PAGE
// ----------------------------

export function renderLogin() {
  document.getElementById("app").innerHTML = `
    <div style="
      max-width:380px;
      margin:80px auto;
      padding:24px;
    ">
      <h1 style="font-size:26px;font-weight:700;margin-bottom:6px">Money Saver Pro</h1>
      <p style="opacity:0.5;font-size:13px;margin-bottom:30px">Sign in to continue</p>

      <div id="auth-error" style="
        display:none;
        background:rgba(248,113,113,0.15);
        color:#f87171;
        padding:12px 16px;
        border-radius:12px;
        font-size:13px;
        margin-bottom:16px;
      "></div>

      <input id="auth-email" type="email" placeholder="Email address" style="
        width:100%;
        padding:14px 16px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.1);
        background:#111827;
        color:white;
        font-size:15px;
        margin-bottom:10px;
        outline:none;
        display:block;
      ">

      <input id="auth-password" type="password" placeholder="Password" style="
        width:100%;
        padding:14px 16px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.1);
        background:#111827;
        color:white;
        font-size:15px;
        margin-bottom:20px;
        outline:none;
        display:block;
      ">

      <button id="btn-signin" style="
        width:100%;
        padding:14px;
        border-radius:14px;
        border:none;
        background:linear-gradient(135deg,#2563eb,#06b6d4);
        color:white;
        font-size:16px;
        font-weight:700;
        cursor:pointer;
        margin-bottom:10px;
        display:block;
      ">Sign In</button>

      <button id="btn-register" style="
        width:100%;
        padding:14px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,0.15);
        background:transparent;
        color:white;
        font-size:16px;
        font-weight:600;
        cursor:pointer;
        margin-bottom:10px;
        display:block;
      ">Create Account</button>

      <div style="
        text-align:center;
        opacity:0.4;
        font-size:12px;
        margin-bottom:10px;
      ">or</div>

      <button id="btn-google" style="
        width:100%;
        padding:14px;
        border-radius:14px;
        border:none;
        background:white;
        color:#111827;
        font-size:15px;
        font-weight:700;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:10px;
      ">
        <img src="https://www.google.com/favicon.ico" width="16" style="display:inline">
        Continue with Google
      </button>
    </div>
  `;

  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const errorBox = document.getElementById("auth-error");

  function showError(msg) {
    errorBox.style.display = "block";
    errorBox.textContent = msg;
  }

  function hideError() {
    errorBox.style.display = "none";
  }

  document.getElementById("btn-signin").onclick = async () => {
    hideError();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return showError("Please enter email and password.");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      showError("Invalid email or password.");
    }
  };

  document.getElementById("btn-register").onclick = async () => {
    hideError();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return showError("Please enter email and password.");
    if (password.length < 6) return showError("Password must be at least 6 characters.");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      showError(e.message.replace("Firebase: ", ""));
    }
  };

  document.getElementById("btn-google").onclick = async () => {
    hideError();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      showError("Google sign-in failed. Try again.");
    }
  };
}

// ----------------------------
// WATCH AUTH STATE
// ----------------------------

export function watchAuth(onSignedIn, onSignedOut) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      onSignedIn(user);
    } else {
      onSignedOut();
    }
  });
}

// ----------------------------
// SIGN OUT
// ----------------------------

export async function logOut() {
  await signOut(auth);
}
