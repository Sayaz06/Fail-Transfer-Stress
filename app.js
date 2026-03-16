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
const progressContainer = document.getElementById("progress-container"); // Tambahan untuk progress bar

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
  if (progressContainer) progressContainer.innerHTML = ""; // Bersihkan progress bar lama bila buka panel

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
    const files = fileInput.files;
    if (!files || files.length === 0) return alert("Please select file(s)");
    statusEl.textContent = "Uploading...";

    if (progressContainer) progressContainer.innerHTML = ""; // Bersihkan kontena sebelum upload baru

    try {
      // Guna Promise.all supaya boleh upload serentak
      const uploadPromises = Array.from(files).map(file => {
        // Bina elemen UI untuk garisan progress fail ini
        const fileWrapper = document.createElement("div");
        fileWrapper.style.marginBottom = "10px";

        const fileLabel = document.createElement("div");
        fileLabel.textContent = file.name;
        fileLabel.style.fontSize = "14px";
        fileLabel.style.marginBottom = "5px";
        fileLabel.style.color = "#333";
        fileLabel.style.wordBreak = "break-all";

        const progressBarContainer = document.createElement("div");
        progressBarContainer.style.width = "100%";
        progressBarContainer.style.backgroundColor = "#e0e0e0";
        progressBarContainer.style.borderRadius = "4px";
        progressBarContainer.style.overflow = "hidden";

        const progressBar = document.createElement("div");
        progressBar.style.width = "0%";
        progressBar.style.height = "8px";
        progressBar.style.backgroundColor = "#6366f1"; // Warna tema
        progressBar.style.transition = "width 0.2s ease";

        const progressText = document.createElement("div");
        progressText.textContent = "0%";
        progressText.style.fontSize = "12px";
        progressText.style.textAlign = "right";
        progressText.style.marginTop = "2px";
        progressText.style.color = "#666";

        // Gabungkan elemen ke dalam satu div
        progressBarContainer.appendChild(progressBar);
        fileWrapper.appendChild(fileLabel);
        fileWrapper.appendChild(progressBarContainer);
        fileWrapper.appendChild(progressText);
        if (progressContainer) progressContainer.appendChild(fileWrapper);

        // Callback untuk kemaskini peratusan garisan yang dipanggil dari upload.js
        const onProgress = (percent) => {
          progressBar.style.width = percent + "%";
          progressText.textContent = Math.round(percent) + "%";
        };

        // Panggil fungsi uploadFile dengan callback onProgress
        return window.Uploader.uploadFile(storage, db, auth, type, file, onProgress);
      });

      // Tunggu kesemua fail siap dimuat naik
      await Promise.all(uploadPromises);

      statusEl.textContent = "All files uploaded ✔️";
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
    if (progressContainer) progressContainer.innerHTML = ""; // Tutup panel = bersihkan progress bar
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
