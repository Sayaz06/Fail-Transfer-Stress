// Firebase config (from Ad)
const firebaseConfig = {
  apiKey: "AIzaSyCnBPpkFYRV0SqCqO376h_VG8_GdXesVck",
  authDomain: "fail-transfer-stress.firebaseapp.com",
  projectId: "fail-transfer-stress",
  storageBucket: "fail-transfer-stress.firebasestorage.app",
  messagingSenderId: "555649847596",
  appId: "1:555649847596:web:4b2a9f8e63c1bc8e521c89",
  measurementId: "G-FPR8YLRRMX"
};

// Init
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Elements
const loginPage = document.getElementById("login-page");
const homePage = document.getElementById("home-page");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panel-title");
const closePanelBtn = document.getElementById("close-panel");
const messageSection = document.getElementById("message-section");
const fileSection = document.getElementById("file-section");
const messageInput = document.getElementById("message-input");
const sendMessageBtn = document.getElementById("send-message");
const fileInput = document.getElementById("file-input");
const uploadFileBtn = document.getElementById("upload-file");
const statusEl = document.getElementById("status");
const recentList = document.getElementById("recent-list");

// PWA: register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.log("SW registration failed:", err);
    });
  });
}

// Login
loginBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => {
    alert("Login failed: " + err.message);
  });
});

// Logout
logoutBtn.addEventListener("click", () => {
  auth.signOut();
});

// Auth state
auth.onAuthStateChanged(user => {
  if (user) {
    loginPage.classList.add("hidden");
    homePage.classList.remove("hidden");
    loadRecentTransfers();
  } else {
    homePage.classList.add("hidden");
    loginPage.classList.remove("hidden");
    recentList.innerHTML = "";
  }
});

// Open panel by type buttons
document.querySelectorAll('button[data-type]').forEach(btn => {
  btn.addEventListener('click', () => openPanel(btn.dataset.type));
});

function openPanel(type) {
  panel.classList.remove("hidden");
  statusEl.textContent = "";
  messageSection.classList.add("hidden");
  fileSection.classList.add("hidden");

  panelTitle.textContent = labelForType(type);

  if (type === "message") {
    messageSection.classList.remove("hidden");
  } else {
    fileSection.classList.remove("hidden");
    fileInput.accept = acceptForType(type);
  }

  // Bind actions
  sendMessageBtn.onclick = async () => {
    const text = messageInput.value.trim();
    if (!text) return alert("Message is empty");
    statusEl.textContent = "Sending...";
    try {
      await window.Uploader.sendMessage(db, auth, text);
      statusEl.textContent = "Message sent ✔️";
      messageInput.value = "";
      loadRecentTransfers();
    } catch (e) {
      statusEl.textContent = "Failed: " + e.message;
    }
  };

  uploadFileBtn.onclick = async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return alert("Please select a file");
    statusEl.textContent = "Uploading...";
    try {
      await window.Uploader.uploadFile(storage, db, auth, type, file);
      statusEl.textContent = "Uploaded ✔️";
      fileInput.value = "";
      loadRecentTransfers();
    } catch (e) {
      statusEl.textContent = "Failed: " + e.message;
    }
  };

  closePanelBtn.onclick = () => {
    panel.classList.add("hidden");
    statusEl.textContent = "";
    messageInput.value = "";
    fileInput.value = "";
  };
}

function labelForType(type) {
  const map = {
    message: "Type Your Message",
    image: "Transfer Your Image",
    pdf: "Transfer Your PDF",
    document: "Transfer Your Document",
    presentation: "Transfer Your Presentation",
    sheets: "Transfer Your Sheets",
    video: "Transfer Your Video",
    music: "Transfer Your Music",
    coding: "Transfer Your Coding",
  };
  return map[type] || "Transfer";
}

function acceptForType(type) {
  switch (type) {
    case "image": return "image/*";
    case "pdf": return ".pdf,application/pdf";
    case "document": return ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.odt";
    case "presentation": return ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.odp";
    case "sheets": return ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.ods";
    case "video": return "video/*";
    case "music": return "audio/*,.mp3,.wav,.aac";
    case "coding": return ".txt,.md,.json,.js,.ts,.py,.java,.c,.cpp,.html,.css";
    default: return "*/*";
  }
}

// Load recent transfers for current user
async function loadRecentTransfers() {
  const user = auth.currentUser;
  if (!user) return;
  recentList.innerHTML = "<div class='item'><div class='meta'>Loading...</div></div>";
  try {
    const snap = await db.collection("transfers")
      .where("uid", "==", user.uid)
      .orderBy("timestamp", "desc")
      .limit(30)
      .get();

    const html = snap.docs.map(doc => {
      const d = doc.data();
      const id = doc.id;
      const when = d.timestamp && d.timestamp.toDate ? d.timestamp.toDate() : null;
      const time = when ? when.toLocaleString() : "";
      const link = d.url ? `<a href="${d.url}" target="_blank" rel="noopener">Open</a>` : "";
      const name = d.filename || (d.text ? (d.text.slice(0, 40) + (d.text.length > 40 ? "…" : "")) : "");
      const delBtn = `<button class="btn btn-ghost delete-btn" data-id="${id}" data-path="${d.storagePath || ""}">Delete</button>`;
      return `
        <div class="item">
          <div><strong>${d.type || "unknown"}</strong></div>
          ${name ? `<div>${name}</div>` : ""}
          ${link}
          <div class="meta">${time} • ${d.sender || ""}</div>
          ${delBtn}
        </div>`;
    }).join("");
    recentList.innerHTML = html || "<div class='item'><div>No items yet</div></div>";

// Attach delete handlers
document.querySelectorAll(".delete-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const docId = btn.dataset.id;
    const path = btn.dataset.path;

    // Tunjuk confirm dialog
    const sure = confirm("Are you sure you want to delete this item?");
    if (!sure) return; // kalau user tekan Cancel, stop

    try {
      await window.Uploader.deleteTransfer(db, storage, docId, path);
      loadRecentTransfers();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  });
});

  } catch (e) {
    recentList.innerHTML = "<div class='item'><div class='meta'>Failed to load: " + e.message + "</div></div>";
  }
}
