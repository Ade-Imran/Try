// File: script.js

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: ""AIzaSyA9SXxrSSYHo57Dl8WdozhWRp_yNwRpTU0",
  authDomain: "food-collection-system-2009.firebaseapp.com  c",
  databaseURL: "https://food-collection-system-2009-default-rtdb.firebaseio.com",
  projectId: "food-collection-system-2009",
  storageBucket: "food-collection-system-2009.firebasestorage.app",
  messagingSenderId: "1077397622769",
  appId: "1:1077397622769:web:0212e4f3f2fb5eb0843e50"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- App State ---
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";
let isAdmin = false;
let qrConfigs = {};
let generatedQRCodes = [];
let qrGenEnabled = true;
let currentQRCode = null;
let html5QrcodeScanner = null;
let scanContext = null;
let selectedAdminCategory = null;
let navigationHistory = [];
let lastGeneratedQRCodeData = null;
let chartInstance = null;

// --- Real-time Listeners ---
// Initial fetch
Promise.all([
  db.ref('qrConfigs').once('value'),
  db.ref('generatedQRCodes').once('value'),
  db.ref('qrGenEnabled').once('value')
]).then(([cfgSnap, codesSnap, genSnap]) => {
  qrConfigs = cfgSnap.val() || {};
  generatedQRCodes = codesSnap.val() || [];
  qrGenEnabled = genSnap.val() !== null ? genSnap.val() : true;
  updateQRGenButton();
  showStatistics();
});
// Subscriptions
db.ref('qrConfigs').on('value', snap => qrConfigs = snap.val() || {});
db.ref('generatedQRCodes').on('value', snap => { generatedQRCodes = snap.val() || []; showStatistics(); });
db.ref('qrGenEnabled').on('value', snap => { qrGenEnabled = snap.val(); updateQRGenButton(); });

// --- UI Helpers ---
function showElement(id) { document.getElementById(id).classList.remove("hidden"); }
function hideElement(id) { document.getElementById(id).classList.add("hidden"); }
function hideAllPanels() { document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden")); }
function navigateTo(panelId) {
  const current = document.querySelector(".panel:not(.hidden)");
  if (current) navigationHistory.push(current.id);
  hideAllPanels(); showElement(panelId);
}
function backToPrevious() {
  if (navigationHistory.length) {
    const prev = navigationHistory.pop();
    hideAllPanels(); showElement(prev);
  } else {
    isAdmin ? navigateTo("admin-dashboard") : backToDashboard();
  }
}
function backToDashboard() { navigationHistory = []; hideAllPanels(); showElement("dashboard"); }

// --- Update QR Gen Button ---
function updateQRGenButton() {
  const btn = document.getElementById("qr-gen-btn");
  btn.disabled = !qrGenEnabled;
  btn.innerText = qrGenEnabled ? "Generate QR Code" : "QR Code Generation Disabled";
  const statusEl = document.getElementById("qr-gen-status");
  if (statusEl) statusEl.innerText = qrGenEnabled ? "Enabled" : "Disabled";
}

// --- Admin Authentication ---
function adminLogin() {
  const u = document.getElementById("admin-username").value;
  const p = document.getElementById("admin-password").value;
  if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
    document.getElementById("login-error").classList.add("hidden");
    isAdmin = true;
    navigateTo("admin-dashboard");
  } else {
    document.getElementById("login-error").classList.remove("hidden");
  }
}
function logoutAdmin() {
  isAdmin = false;
  document.getElementById("admin-username").value = "";
  document.getElementById("admin-password").value = "";
  backToDashboard();
}

// --- Category Selection ---
function selectAdminCategory(type) {
  hideAllPanels();
  navigateTo(type === "male" ? "admin-male-subcategories" : "admin-female-subcategories");
}
function setAdminCategory(category) {
  selectedAdminCategory = category;
  navigationHistory = [];
  hideAllPanels(); showElement("admin-settings-form");
  document.getElementById("selected-category-display").innerText = "Settings for " + category;
  const cfg = qrConfigs[category] || {};
  document.getElementById("start-time").value = cfg.start || "";
  document.getElementById("end-time").value   = cfg.end   || "";
  document.getElementById("max-claims").value = cfg.maxClaims || 1;
}

// --- Toggle QR Generation ---
function toggleQRGeneration() {
  qrGenEnabled = !qrGenEnabled;
  db.ref('qrGenEnabled').set(qrGenEnabled);
  updateQRGenButton();
  alert("QR Code Generation is now " + (qrGenEnabled ? "Enabled" : "Disabled") + ".");
}

// --- Admin Settings ---
function saveSettings() {
  if (!selectedAdminCategory) return alert("Select a category first.");
  const start = document.getElementById("start-time").value;
  const end   = document.getElementById("end-time").value;
  const maxC  = parseInt(document.getElementById("max-claims").value, 10);
  if (!start || !end || isNaN(maxC)) return alert("Fill all fields correctly.");
  qrConfigs[selectedAdminCategory] = { start, end, maxClaims: maxC };
  db.ref('qrConfigs').set(qrConfigs);
  generatedQRCodes = generatedQRCodes.map(e => {
    if (e.category === selectedAdminCategory) e.claims = 0;
    return e;
  });
  db.ref('generatedQRCodes').set(generatedQRCodes);
  alert("Settings saved for " + selectedAdminCategory);
}
function deleteSettings() {
  if (!selectedAdminCategory) return alert("Select a category first.");
  delete qrConfigs[selectedAdminCategory];
  db.ref('qrConfigs').set(qrConfigs);
  alert("Settings deleted for " + selectedAdminCategory);
}

// --- User Scanner ---
function startUserScannerForCategory(cat) { scanContext = cat; hideAllPanels(); showElement("scanner"); initScanner(); }
function startUserScanner(userType)             { scanContext = userType; hideAllPanels(); showElement("scanner"); initScanner(); }
function initScanner() {
  document.getElementById("scanner-title").innerText = "Scan Your QR Code";
  document.getElementById("qr-reader-results").innerText = "";
  hideElement("claim-btn");
  html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps:10, qrbox:250 }, false);
  html5QrcodeScanner.render(onScanSuccess, onScanError);
}
function onScanSuccess(decodedText) { html5QrcodeScanner.clear().catch(console.error); validateQRCode(decodedText); }
function onScanError(err)           { console.warn(err); }

// --- Validation & Claim ---
function validateQRCode(scannedCode) {
  try {
    const data = JSON.parse(scannedCode);
    const match = generatedQRCodes.find(e =>
      e.membership===data.membership && e.name===data.name &&
      e.category===data.category && e.validFrom===data.validFrom &&
      e.validTo===data.validTo
    );
    if (!match)               return showInvalid("Invalid QR Code");
    const now = new Date();
    if (now < new Date(data.validFrom) || now > new Date(data.validTo))
                              return showInvalid("QR Code not valid at this time");
    if (scanContext !== data.category)
                              return showInvalid("Invalid category");
    const cfg = qrConfigs[data.category];
    if (!cfg || now < new Date(cfg.start) || now > new Date(cfg.end))
                              return showInvalid("No food available");
    if (match.claims >= cfg.maxClaims)
                              return showInvalid("Already claimed");
    currentQRCode = match;
    document.getElementById("qr-reader-results").innerHTML =
      `<strong>Name:</strong> ${match.name} | <strong>Membership:</strong> ${match.membership} | <strong>Claims:</strong> ${match.claims}/${cfg.maxClaims}`;
    showElement("claim-btn");
  } catch {
    showInvalid("Invalid QR Code");
  }
}
function showInvalid(msg) { alert(msg); initScanner(); }
function claimFood() {
  if (!currentQRCode) return;
  const idx = generatedQRCodes.findIndex(e => e.membership===currentQRCode.membership && e.name===currentQRCode.name);
  if (idx===-1)         return;
  const cfg = qrConfigs[currentQRCode.category];
  const now = new Date();
  if (now < new Date(cfg.start) || now > new Date(cfg.end)) return showInvalid("No food available");
  if (generatedQRCodes[idx].claims >= cfg.maxClaims) return;
  generatedQRCodes[idx].claims++;
  db.ref('generatedQRCodes').set(generatedQRCodes);
  currentQRCode = generatedQRCodes[idx];
  document.getElementById("qr-reader-results").innerHTML =
    `<strong>Name:</strong> ${currentQRCode.name} | <strong>Membership:</strong> ${currentQRCode.membership} | <strong>Claims:</strong> ${currentQRCode.claims}/${cfg.maxClaims}`;
  hideElement("claim-btn");
}

// --- QR Code Generation ---
function generateQRCode() {
  document.getElementById("qr-output").innerHTML = "";
  const membership = document.getElementById("membership-number").value.trim();
  const name       = document.getElementById("member-name").value.trim();
  const category   = document.getElementById("member-category").value;
  const validFrom  = document.getElementById("valid-from").value;
  const validTo    = document.getElementById("valid-to").value;
  if (!membership||!name||!validFrom||!validTo) return alert("Please fill in all fields.");
  if (new Date(validFrom)>=new Date(validTo))   return alert("Valid From must be before Valid To.");
  if (generatedQRCodes.find(e=>e.membership===membership && new Date(e.validTo)>new Date()))
                                                return alert("Existing active QR Code.");
  const data = { membership, name, category, validFrom, validTo, claims:0 };
  new QRCode(document.getElementById("qr-output"), { text: JSON.stringify(data), width:128, height:128 });
  generatedQRCodes.push(data);
  db.ref('generatedQRCodes').set(generatedQRCodes);
  lastGeneratedQRCodeData = data;
  alert("QR Code generated!");
  document.getElementById("print-btn").classList.remove("hidden");
  showStatistics();
}

// --- Print ---
function printQRCode() {
  if (!lastGeneratedQRCodeData) return alert("No QR Code to print.");
  const qrOutputContent = document.getElementById("qr-output").outerHTML;
  const w = window.open("","PrintWindow","width=600,height=600");
  w.document.write(`
<html><head><title>Print QR Code</title><style>
body{font-family:Arial;margin:20px;}
.print-container{text-align:center;}
@media print{body *{visibility:hidden}.print-container,*{visibility:visible}.print-container{position:absolute;top:0;left:0;width:100%;}}
</style></head><body>
<div class="print-container">
<h2>${lastGeneratedQRCodeData.name}</h2>
<p>Membership: ${lastGeneratedQRCodeData.membership}</p>
<p>Valid From: ${lastGeneratedQRCodeData.validFrom}</p>
<p>Valid To: ${lastGeneratedQRCodeData.validTo}</p>
${qrOutputContent}
</div><script>window.print();<\/script>
</body></html>`);
  w.document.close();
}

// --- Statistics ---
function showStatistics() {
  const now = new Date();
  generatedQRCodes = generatedQRCodes.filter(e=>new Date(e.validTo)>now);
  db.ref('generatedQRCodes').set(generatedQRCodes);
  const totalReg = generatedQRCodes.length;
  const totalClaimed = generatedQRCodes.filter(e=>e.claims>0).length;
  document.getElementById("stats-summary").innerHTML =
    `<strong>Total Registered:</strong> ${totalReg} | <strong>Total Claimed:</strong> ${totalClaimed}`;
  const categoryData = generatedQRCodes.reduce((acc,e)=>{
    acc[e.category] = acc[e.category] || {registered:0,claimed:0};
    acc[e.category].registered++;
    if(e.claims>0) acc[e.category].claimed++;
    return acc;
  },{});
  const labels = Object.keys(categoryData);
  const registeredData = labels.map(l=>categoryData[l].registered);
  const claimedData    = labels.map(l=>categoryData[l].claimed);
  const ctx = document.getElementById("chart-canvas").getContext("2d");
  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = registeredData;
    chartInstance.data.datasets[1].data = claimedData;
    chartInstance.update();
  } else {
    chartInstance = new Chart(ctx,{
      type:"bar",
      data:{labels, datasets:[
        {label:"Registered",data:registeredData},
        {label:"Claimed",   data:claimedData}
      ]},
      options:{scales:{y:{beginAtZero:true}}}
    });
  }
  const tbody = document.getElementById("stats-table").querySelector("tbody");
  tbody.innerHTML = "";
  generatedQRCodes.forEach(e=>{
    const row = document.createElement("tr");
    [e.name,e.membership,e.category].forEach(text=>{
      const td=document.createElement("td");
      td.textContent=text;
      row.appendChild(td);
    });
    const tdClaim=document.createElement("td");
    const cfg=e=>qrConfigs[e.category];
    if(cfg(e)&&now>=new Date(cfg(e).start)&&now<=new Date(cfg(e).end)){
      tdClaim.innerHTML = Array.from({length:cfg(e).maxClaims},(_,i)=>
        i<e.claims? "<span class='claim-box claimed'></span>" : "<span class='claim-box'></span>"
      ).join("");
    } else tdClaim.textContent="No food available";
    row.appendChild(tdClaim);
    const tdAction=document.createElement("td");
    const btnDel=document.createElement("button");
    btnDel.textContent="Delete";
    btnDel.onclick=()=>{
      generatedQRCodes=generatedQRCodes.filter(x=>x.membership!==e.membership);
      db.ref('generatedQRCodes').set(generatedQRCodes);
    };
    tdAction.appendChild(btnDel);
    row.appendChild(tdAction);
    tbody.appendChild(row);
  });
}

// --- Search ---
function filterStatsTable() {
  const v=document.getElementById("stats-search").value.toLowerCase();
  document.querySelectorAll("#stats-table tbody tr").forEach(row=>{
    const n=row.cells[0].textContent.toLowerCase();
    const m=row.cells[1].textContent.toLowerCase();
    row.style.display=(n.includes(v)||m.includes(v))?"":"none";
  });
}
document.getElementById("stats-search").addEventListener("input", filterStatsTable);

// On load
updateQRGenButton();