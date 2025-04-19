// script.js

// --- Admin Login (hard‑coded) ---
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
let isAdmin = false;

// --- Your Firebase configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyA9SXxrSSYHo57Dl8WdozhWRp_yNwRpTU0",
  authDomain: "food-collection-system-2009.firebaseapp.com",
  projectId: "food-collection-system-2009",
  storageBucket: "food-collection-system-2009.firebasestorage.app",
  messagingSenderId: "1077397622769",
  appId: "1:1077397622769:web:0212e4f3f2fb5eb0843e50",
  measurementId: "G-G02Y0JBB8P"
};

// --- Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- Firebase helpers ---
function dbRef(path) { return db.ref(path); }
async function dbSet(path, val) { await dbRef(path).set(val); }
async function dbGet(path, fallback = null) {
  const snap = await dbRef(path).get();
  return snap.exists() ? snap.val() : fallback;
}

// --- Global State ---
let qrConfigs        = {};
let qrGenEnabled     = true;
let navigationHistory = [];

// --- On Load: fetch shared state ---
(async function init() {
  qrConfigs    = await dbGet("qrConfigs", {});
  qrGenEnabled = await dbGet("qrGenEnabled", true);
  updateQRGenButton();
})();

// --- UI Helpers ---
function showElement(id) { document.getElementById(id).classList.remove("hidden"); }
function hideElement(id) { document.getElementById(id).classList.add("hidden"); }
function hideAllPanels() { document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden")); }
function navigateTo(panelId) {
  const curr = document.querySelector(".panel:not(.hidden)");
  if (curr) navigationHistory.push(curr.id);
  hideAllPanels();
  showElement(panelId);
}
function backToPrevious() {
  if (navigationHistory.length) {
    hideAllPanels();
    showElement(navigationHistory.pop());
  } else {
    isAdmin ? navigateTo("admin-dashboard") : navigateTo("dashboard");
  }
}

// --- Admin Login ---
function adminLogin() {
  const u   = document.getElementById("admin-username").value;
  const p   = document.getElementById("admin-password").value;
  const err = document.getElementById("login-error");

  if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
    isAdmin = true;
    hideElement("login-error");
    document.getElementById("admin-username").value = "";
    document.getElementById("admin-password").value = "";
    navigateTo("admin-dashboard");
    updateQRGenButton();
  } else {
    document.getElementById("admin-username").value = "";
    document.getElementById("admin-password").value = "";
    err.classList.remove("hidden");
    document.getElementById("admin-username").focus();
  }
}

function logoutAdmin() {
  isAdmin = false;
  navigateTo("dashboard");
}

// --- Toggle QR Code Generation ---
async function toggleQRGeneration() {
  qrGenEnabled = !qrGenEnabled;
  await dbSet("qrGenEnabled", qrGenEnabled);
  updateQRGenButton();
  alert("QR Code Generation is now " + (qrGenEnabled ? "Enabled" : "Disabled") + ".");
}

// --- Update both Generate buttons & status label ---
function updateQRGenButton() {
  const userBtn  = document.getElementById("qr-gen-btn");
  const adminBtn = document.getElementById("admin-qr-gen-btn");
  const status   = document.getElementById("qr-gen-status");

  // disable/enable both buttons
  userBtn.disabled  = !qrGenEnabled;
  adminBtn.disabled = !qrGenEnabled;

  // update user button text
  userBtn.innerText = qrGenEnabled
    ? "Generate QR Code"
    : "QR Code Generation Disabled";

  // update status label
  if (status) {
    status.innerText = qrGenEnabled ? "Enabled" : "Disabled";
  }
}

// --- (All your other functions—selectAdminCategory, saveSettings, startScanner, validateQRCode, generateQRCode, showStatistics, etc.—stay exactly as before, using dbGet/dbSet for persistence) ---

// Ensure both buttons are in the correct state on page load
updateQRGenButton();
