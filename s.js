// Initialize Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Firestore Helper Functions ---
const BROWSER_ID = navigator.userAgent;

async function lsKey(key) {
  return `${BROWSER_ID}::${key}`;
}

async function lsGet(key, fallback) {
  const docRef = db.collection('localStorage').doc(await lsKey(key));
  const doc = await docRef.get();
  return doc.exists ? doc.data().value : fallback;
}

async function lsSet(key, value) {
  const docRef = db.collection('localStorage').doc(await lsKey(key));
  await docRef.set({ value });
}

// --- Global Constants & Variables ---
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
let isAdmin = false;

// Now session‑scoped
let qrConfigs = await lsGet("qrConfigs", {});
let currentQRCode = null;
let html5QrcodeScanner = null;
let scanContext = null;
let selectedAdminCategory = null;

// session‑scoped flag
let qrGenEnabled = await lsGet("qrGenEnabled", true);

let navigationHistory = [];
let lastGeneratedQRCodeData = null;
let chartInstance = null;

// --- Utility Function to Restart Scanner on Invalid Scan ---
function handleInvalidScan(message) {
  alert(message);
  startScanner();
}

// --- UI Helper Functions ---
function showElement(id) { document.getElementById(id).classList.remove("hidden"); }
function hideElement(id) { document.getElementById(id).classList.add("hidden"); }
function hideAllPanels() { document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden")); }
function navigateTo(panelId) {
  const current = document.querySelector(".panel:not(.hidden)");
  if (current) navigationHistory.push(current.id);
  hideAllPanels();
  showElement(panelId);
}
function backToPrevious() {
  if (navigationHistory.length) {
    const prev = navigationHistory.pop();
    hideAllPanels();
    showElement(prev);
  } else {
    isAdmin ? navigateTo("admin-dashboard") : backToDashboard();
  }
}
function backToDashboard() {
  navigationHistory = [];
  hideAllPanels();
  showElement("dashboard");
}
function updateQRGenButton() {
  const btn = document.getElementById("qr-gen-btn");
  btn.disabled = !qrGenEnabled;
  btn.innerText = qrGenEnabled ? "Generate QR Code" : "QR Code Generation Disabled";
  const statusEl = document.getElementById("qr-gen-status");
  if (statusEl) statusEl.innerText = qrGenEnabled ? "Enabled" : "Disabled";
}

// --- Admin Login Functions ---
async function adminLogin() {
  const u = document.getElementById("admin-username").value;
  const p = document.getElementById("admin-password").value;
  if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
    hideElement("login-error");
    isAdmin = true;
    navigateTo("admin-dashboard");
    updateQRGenButton();
  } else {
    showElement("login-error");
    document.getElementById("admin-username").value = "";
    document.getElementById("admin-password").value = "";
  }
}
async function logoutAdmin() {
  isAdmin = false;
  document.getElementById("admin-username").value = "";
  document.getElementById("admin-password").value = "";
  backToDashboard();
}

// --- Admin Category Selection ---
function selectAdminCategory(type) {
  hideElement("admin-dashboard");
  navigateTo(type === "male" ? "admin-male-subcategories" : "admin-female-subcategories");
}
async function setAdminCategory(category) {
  selectedAdminCategory = category;
  navigationHistory = [];
  navigateTo("admin-settings-form");
  document.getElementById("selected-category-display").innerText = "Settings for " + category;
  const cfg = qrConfigs[category] || {};
  document.getElementById("start-time").value = cfg.start || "";
  document.getElementById("end-time").value   = cfg.end   || "";
  document.getElementById("max-claims").value = cfg.maxClaims || "1";
}

// --- Admin Global Control for QR Generation ---
async function toggleQRGeneration() {
  qrGenEnabled = !qrGenEnabled;
  await lsSet("qrGenEnabled", qrGenEnabled);
  updateQRGenButton();
  alert("QR Code Generation is now " + (qrGenEnabled ? "Enabled" : "Disabled") + ".");
}

// --- Admin Settings: Save & Delete ---
async function saveSettings() {
  if (!selectedAdminCategory) {
    alert("Please select a category first.");
    return;
  }
  const start = document.getElementById("start-time").value;
  const end   = document.getElementById("end-time").value;
  const maxC  = parseInt(document.getElementById("max-claims").value, 10);
  if (!start || !end || isNaN(maxC)) {
    alert("Please fill in all fields correctly.");
    return;
  }
  qrConfigs[selectedAdminCategory] = { start, end, maxClaims: maxC };
  await lsSet("qrConfigs", qrConfigs);

  // reset claims for that category
  let codes = await lsGet("generatedQRCodes", []);
  codes = codes.map(e => {
    if (e.category === selectedAdminCategory) e.claims = 0;
    return e;
  });
  await lsSet("generatedQRCodes", codes);

  alert("Settings saved for " + selectedAdminCategory + ". Claim data cleared for fresh interval.");
}

async function deleteSettings() {
  if (!selectedAdminCategory) {
    alert("Please select a category first.");
    return;
  }
  delete qrConfigs[selectedAdminCategory];
  await lsSet("qrConfigs", qrConfigs);
  alert("Settings deleted for " + selectedAdminCategory);
}

// --- User Scanning Functions ---
async function startUserScannerForCategory(cat) {
  scanContext = cat;
  navigationHistory = [];
  navigateTo("scanner");
  document.getElementById("scanner-title").innerText = "Scan Your QR Code";
  document.getElementById("qr-reader-results").innerText = "";
  hideElement("claim-btn");
  startScanner();
}
async function startUserScanner(userType) {
  scanContext = userType;
  navigationHistory = [];
  navigateTo("scanner");
  document.getElementById("scanner-title").innerText = "Scan Your QR Code";
  document.getElementById("qr-reader-results").innerText = "";
  hideElement("claim-btn");
  startScanner();
}

// --- Scanning via html5‑qrcode ---
function startScanner
::contentReference[oaicite:0]{index=0}
 
