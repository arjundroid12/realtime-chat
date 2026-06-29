/* =============================================================
 * Realtime Chat · client
 * Connects to Socket.io server, handles room join/leave,
 * messages, typing indicators, and user list.
 * ============================================================= */

(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);

  // ---------- DOM refs ----------
  const els = {
    joinScreen: $("#joinScreen"),
    chatScreen: $("#chatScreen"),
    joinForm: $("#joinForm"),
    nickInput: $("#nickInput"),
    roomInput: $("#roomInput"),

    currentRoom: $("#currentRoom"),
    roomTitle: $("#roomTitle"),
    leaveRoomBtn: $("#leaveRoomBtn"),
    userCount: $("#userCount"),
    userList: $("#userList"),

    connectionStatus: $("#connectionStatus"),
    messages: $("#messages"),
    typingIndicator: $("#typingIndicator"),

    messageForm: $("#messageForm"),
    messageInput: $("#messageInput"),

    themeToggle: $("#themeToggle"),
  };

  // ---------- State ----------
  const state = {
    socket: null,
    nick: "",
    room: "",
    users: [],
    typingUsers: new Set(),
    typingTimers: new Map(),
  };

  const THEME_KEY = "chat.theme";

  // ---------- Helpers ----------
  const escapeHtml = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const initials = (name) =>
    (name || "?").trim().charAt(0).toUpperCase();

  const scrollMessagesToBottom = () => {
    requestAnimationFrame(() => {
      els.messages.scrollTop = els.messages.scrollHeight;
    });
  };

  // ---------- Render messages ----------
  const renderMessage = (msg) => {
    // Remove empty placeholder
    const empty = els.messages.querySelector(".messages__empty");
    if (empty) empty.remove();

    const isOwn = msg.userId === state.socket?.id;
    const isSystem = msg.system === true;

    const wrap = document.createElement("div");
    wrap.className = "message" + (isOwn ? " message--own" : "") + (isSystem ? " message--system" : "");

    if (isSystem) {
      wrap.innerHTML = `<div class="message__bubble message__bubble--system">${escapeHtml(msg.text)}</div>`;
    } else {
      wrap.innerHTML = `
        <div class="message__avatar">${escapeHtml(initials(msg.nick))}</div>
        <div class="message__body">
          <div class="message__meta">
            <span class="message__nick">${escapeHtml(msg.nick)}${isOwn ? " (you)" : ""}</span>
            <span class="message__time">${formatTime(msg.ts)}</span>
          </div>
          <div class="message__bubble">${escapeHtml(msg.text)}</div>
        </div>
      `;
    }

    els.messages.appendChild(wrap);
    scrollMessagesToBottom();
  };

  // ---------- Render user list ----------
  const renderUsers = () => {
    els.userCount.textContent = state.users.length;
    els.userList.innerHTML = "";
    state.users.forEach((u) => {
      const li = document.createElement("li");
      const isYou = u.id === state.socket?.id;
      li.className = "user-list__item" + (isYou ? " is-you" : "");
      li.innerHTML = `
        <span class="user-list__dot"></span>
        <span>${escapeHtml(u.nick)}${isYou ? " (you)" : ""}</span>
      `;
      els.userList.appendChild(li);
    });
  };

  // ---------- Typing indicator ----------
  const renderTyping = () => {
    const others = [...state.typingUsers].filter((id) => id !== state.socket?.id);
    if (others.length === 0) {
      els.typingIndicator.hidden = true;
      els.typingIndicator.textContent = "";
      return;
    }
    const names = others
      .map((id) => state.users.find((u) => u.id === id)?.nick || "Someone")
      .slice(0, 3);
    const suffix = others.length > 3 ? ` and ${others.length - 3} more` : "";
    const verb = others.length === 1 ? "is" : "are";
    els.typingIndicator.hidden = false;
    els.typingIndicator.innerHTML = `${escapeHtml(names.join(", "))} ${verb} typing<span>.</span><span>.</span><span>.</span>`;
  };

  // ---------- Connection status ----------
  const setStatus = (kind, text) => {
    els.connectionStatus.className = `status status--${kind}`;
    els.connectionStatus.textContent = text;
  };

  // ---------- Theme ----------
  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    els.themeToggle.textContent = theme === "light" ? "☀️" : "🌙";
  };

  const initTheme = () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      applyTheme(saved);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      applyTheme("light");
    } else {
      applyTheme("dark");
    }
  };

  els.themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  // ---------- Join flow ----------
  els.joinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nick = els.nickInput.value.trim();
    const room = els.roomInput.value.trim() || "general";
    if (!nick) return;

    state.nick = nick;
    state.room = room.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase() || "general";

    connectAndJoin();
  });

  const connectAndJoin = () => {
    setStatus("connecting", "connecting…");

    state.socket = io({
      transports: ["websocket", "polling"],
    });

    state.socket.on("connect", () => {
      setStatus("online", "connected");
      state.socket.emit("room:join", { roomId: state.room, nick: state.nick }, (res) => {
        if (res?.ok) {
          showChat(res.room, res.users);
        } else {
          alert("Could not join room. Please try again.");
        }
      });
    });

    state.socket.on("connect_error", () => {
      setStatus("offline", "disconnected");
    });

    state.socket.on("disconnect", () => {
      setStatus("offline", "disconnected");
      els.messageInput.disabled = true;
      els.messageForm.querySelector("button").disabled = true;
    });

    state.socket.on("reconnect", () => {
      setStatus("online", "connected");
      state.socket.emit("room:join", { roomId: state.room, nick: state.nick });
    });

    // Incoming events
    state.socket.on("message:new", renderMessage);

    state.socket.on("user:joined", (data) => {
      renderMessage({
        id: `sys-${Date.now()}`,
        userId: "system",
        nick: "system",
        text: `${data.nick} joined the room`,
        ts: data.ts,
        system: true,
      });
    });

    state.socket.on("user:left", (data) => {
      renderMessage({
        id: `sys-${Date.now()}`,
        userId: "system",
        nick: "system",
        text: `${data.nick} left the room`,
        ts: data.ts,
        system: true,
      });
    });

    state.socket.on("room:users", ({ users }) => {
      state.users = users;
      renderUsers();
    });

    state.socket.on("typing:update", ({ id, nick, typing }) => {
      if (typing) {
        state.typingUsers.add(id);
        // Auto-clear after 4s as a safety net
        clearTimeout(state.typingTimers.get(id));
        state.typingTimers.set(
          id,
          setTimeout(() => {
            state.typingUsers.delete(id);
            state.typingTimers.delete(id);
            renderTyping();
          }, 4000)
        );
      } else {
        state.typingUsers.delete(id);
        clearTimeout(state.typingTimers.get(id));
        state.typingTimers.delete(id);
      }
      renderTyping();
    });
  };

  const showChat = (room, users) => {
    els.joinScreen.hidden = true;
    els.chatScreen.hidden = false;
    els.currentRoom.textContent = `#${room.id}`;
    els.roomTitle.textContent = `# ${room.id}`;
    state.users = users;
    renderUsers();
    els.messageInput.disabled = false;
    els.messageForm.querySelector("button").disabled = false;
    els.messageInput.focus();
  };

  // ---------- Send message ----------
  els.messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = els.messageInput.value.trim();
    if (!text || !state.socket) return;
    state.socket.emit("message:send", { text });
    els.messageInput.value = "";
    state.socket.emit("typing:stop");
  });

  // ---------- Typing indicator (outbound) ----------
  let lastTypingState = false;
  let typingStopTimer = null;

  els.messageInput.addEventListener("input", () => {
    if (!state.socket) return;
    const isTyping = els.messageInput.value.length > 0;
    if (isTyping !== lastTypingState) {
      lastTypingState = isTyping;
      state.socket.emit(isTyping ? "typing:start" : "typing:stop");
    }
    // Reset auto-stop timer
    clearTimeout(typingStopTimer);
    if (isTyping) {
      typingStopTimer = setTimeout(() => {
        lastTypingState = false;
        state.socket.emit("typing:stop");
      }, 3000);
    }
  });

  // ---------- Leave room ----------
  els.leaveRoomBtn.addEventListener("click", () => {
    if (!confirm("Leave this room?")) return;
    if (state.socket) {
      state.socket.disconnect();
    }
    location.reload();
  });

  // ---------- Enter to send (without shift) ----------
  els.messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      els.messageForm.dispatchEvent(new Event("submit"));
    }
  });

  // ---------- Init ----------
  initTheme();
  els.nickInput.focus();
})();
