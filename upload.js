// Uploader module for message + file types
(function () {
  async function ensureAuth(auth) {
    const user = auth.currentUser;
    if (!user) throw new Error("Please login first");
    return user;
  }

  // Send text message to Firestore
  async function sendMessage(db, auth, text) {
    const user = await ensureAuth(auth);
    const entry = {
      uid: user.uid,
      sender: user.email || user.uid,
      type: "message",
      text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("transfers").add(entry);
    return true;
  }

  // Upload file to Storage and record metadata in Firestore
  async function uploadFile(storage, db, auth, type, file) {
    const user = await ensureAuth(auth);

    // Path: uid/type/filename
    const safeName = sanitizeFileName(file.name);
    const ref = storage.ref(`${user.uid}/${type}/${Date.now()}_${safeName}`);

    // Upload
    const snapshot = await ref.put(file);

    // Get URL
    const url = await snapshot.ref.getDownloadURL();

    // Record metadata
    const entry = {
      uid: user.uid,
      sender: user.email || user.uid,
      type,
      filename: safeName,
      size: file.size,
      mime: file.type || "application/octet-stream",
      url,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("transfers").add(entry);
    return url;
  }

  function sanitizeFileName(name) {
    return name.replace(/[^\w.\-]+/g, "_");
  }

  window.Uploader = { sendMessage, uploadFile };
})();
