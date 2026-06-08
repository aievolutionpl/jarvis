/**
 * JARVIS — Main entry point.
 *
 * Wires together the orb visualization, WebSocket communication,
 * speech recognition, and audio playback into a single experience.
 */

import { createOrb, type OrbState } from "./orb";
import { createVoiceInput, createAudioPlayer } from "./voice";
import { createSocket } from "./ws";
import { openSettings, checkFirstTimeSetup } from "./settings";
import "./style.css";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type State = "idle" | "listening" | "thinking" | "speaking";
let currentState: State = "idle";
let isMuted = false;

const statusEl = document.getElementById("status-text")!;
const errorEl = document.getElementById("error-text")!;

const metricLink = document.getElementById("metric-link")!;
const metricUptime = document.getElementById("metric-uptime")!;
const metricLoad = document.getElementById("metric-load")!;
const metricDisk = document.getElementById("metric-disk")!;
const metricCost = document.getElementById("metric-cost")!;
const metricTokens = document.getElementById("metric-tokens")!;
const eventLog = document.getElementById("event-log")!;
const dropZone = document.getElementById("drop-zone")!;
const quickActions = document.getElementById("quick-actions")!;
const artifactList = document.getElementById("artifact-list")!;
const pendingActions = document.getElementById("pending-actions")!;

const statePill = document.getElementById("state-pill")!;
const statePillLabel = document.getElementById("state-pill-label")!;
const toastStack = document.getElementById("toast-stack")!;

type LogTone = "user" | "jarvis" | "system";

function addLog(text: string, tone: LogTone = "system") {
  const row = document.createElement("div");
  row.className = `log-row ${tone}`;
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  row.innerHTML = `<span>${time}</span><p></p>`;
  row.querySelector("p")!.textContent = text;
  eventLog.prepend(row);
  while (eventLog.children.length > 12) eventLog.lastElementChild?.remove();
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function refreshSystemMetrics() {
  metricLink.textContent = socket.isConnected() ? "online" : "offline";
  metricLink.classList.toggle("offline", !socket.isConnected());
  try {
    const res = await fetch("/api/system");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    metricUptime.textContent = formatDuration(Number(data.uptime_seconds));
    metricLoad.textContent = typeof data.load_average === "number" ? data.load_average.toFixed(2) : "--";
    metricDisk.textContent = typeof data.disk_free_gb === "number" ? `${data.disk_free_gb.toFixed(1)} GB` : "--";
  } catch {
    metricUptime.textContent = "--";
    metricLoad.textContent = "--";
    metricDisk.textContent = "--";
  }
}

function formatTokens(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

async function refreshUsage() {
  try {
    const res = await fetch("/api/usage");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const session = data.session || {};
    const today = data.today || {};
    const tokens = Number(session.input_tokens || 0) + Number(session.output_tokens || 0);
    metricTokens.textContent = formatTokens(tokens);
    metricCost.textContent = typeof today.cost_usd === "number" ? `$${today.cost_usd.toFixed(2)}` : "--";
  } catch {
    metricTokens.textContent = "--";
    metricCost.textContent = "--";
  }
}

// Monotonic id stamped on every outgoing command. The server echoes it back as
// `reqId`, so a reply for a superseded command (the user barged in) is discarded.
let commandSeq = 0;

function sendCommand(text: string, source: "voice" | "quick" | "file" | "text" = "quick") {
  audioPlayer.stop();
  commandSeq += 1;
  socket.send({ type: "transcript", text, isFinal: true, source, id: commandSeq });
  addLog(text, source === "file" ? "system" : "user");
  transition("thinking");
}

type ToastType = "info" | "success" | "error";

function showToast(msg: string, type: ToastType = "info", duration = 4000) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  toastStack.appendChild(toast);
  while (toastStack.children.length > 4) toastStack.firstElementChild?.remove();
  setTimeout(() => {
    toast.classList.add("leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, duration);
}

function showError(msg: string) {
  // Keep the legacy element in sync for any external callers, but surface via toast.
  errorEl.textContent = msg;
  showToast(msg, "error", 5000);
}

function updateStatus(state: State) {
  const labels: Record<State, string> = {
    idle: "",
    listening: "listening...",
    thinking: "thinking...",
    speaking: "",
  };
  statusEl.textContent = labels[state];
  updateStatePill(state);
}

function updateStatePill(state: State) {
  const pillLabels: Record<State, string> = {
    idle: "standby",
    listening: "listening",
    thinking: "thinking",
    speaking: "speaking",
  };
  statePill.className = isMuted ? "state-idle muted" : `state-${state}`;
  statePillLabel.textContent = isMuted ? "muted" : pillLabels[state];
}

// ---------------------------------------------------------------------------
// Init components
// ---------------------------------------------------------------------------

const canvas = document.getElementById("orb-canvas") as HTMLCanvasElement;
const orb = createOrb(canvas);

const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
const WS_URL = `${wsProto}//${window.location.host}/ws/voice`;
const socket = createSocket(WS_URL);

const audioPlayer = createAudioPlayer();
orb.setAnalyser(audioPlayer.getAnalyser());

let micResumeTimer: number | undefined;

function transition(newState: State) {
  if (newState === currentState) return;
  const prevState = currentState;
  currentState = newState;
  orb.setState(newState as OrbState);
  updateStatus(newState);

  if (micResumeTimer !== undefined) {
    clearTimeout(micResumeTimer);
    micResumeTimer = undefined;
  }

  switch (newState) {
    case "idle":
    case "listening":
      if (!isMuted) {
        // Brief debounce when JARVIS just finished speaking so the audio tail
        // isn't picked back up by the mic as a phantom transcript.
        const delay = prevState === "speaking" ? 300 : 0;
        micResumeTimer = window.setTimeout(() => voiceInput.resume(), delay);
      }
      break;
    case "thinking":
    case "speaking":
      voiceInput.pause();
      break;
  }
}

// ---------------------------------------------------------------------------
// Voice input
// ---------------------------------------------------------------------------

const voiceInput = createVoiceInput(
  (text: string) => {
    // User spoke — send transcript
    sendCommand(text, "voice");
  },
  (msg: string) => {
    showError(msg);
  }
);

// ---------------------------------------------------------------------------
// Audio playback finished
// ---------------------------------------------------------------------------

audioPlayer.onFinished(() => {
  transition("idle");
});

// ---------------------------------------------------------------------------
// WebSocket messages
// ---------------------------------------------------------------------------

socket.onMessage((msg) => {
  const type = msg.type as string;

  // Drop replies for a command the user has already superseded (barge-in).
  const reqId = msg.reqId as number | undefined;
  if (reqId !== undefined && reqId !== commandSeq) {
    console.log("[ws] dropping stale reply", reqId, "current", commandSeq);
    return;
  }

  if (type === "audio") {
    const audioData = msg.data as string;
    console.log("[audio] received", audioData ? `${audioData.length} chars` : "EMPTY", "state:", currentState);
    if (audioData) {
      if (currentState !== "speaking") {
        transition("speaking");
      }
      audioPlayer.enqueue(audioData);
    } else {
      // TTS failed — no audio but still need to return to idle
      console.warn("[audio] no data received, returning to idle");
      transition("idle");
    }
    // Log text for debugging
    if (msg.text) {
      console.log("[JARVIS]", msg.text);
      addLog(String(msg.text), "jarvis");
    }
  } else if (type === "status") {
    const state = msg.state as string;
    if (state === "thinking" && currentState !== "thinking") {
      transition("thinking");
    } else if (state === "working") {
      // Task spawned — show thinking with a different label
      transition("thinking");
      statusEl.textContent = "working...";
    } else if (state === "idle") {
      transition("idle");
    }
  } else if (type === "text") {
    // Text fallback when TTS fails
    console.log("[JARVIS]", msg.text);
    if (msg.text) addLog(String(msg.text), "jarvis");
  } else if (type === "task_spawned") {
    console.log("[task]", "spawned:", msg.task_id, msg.prompt);
    addLog(`Task spawned: ${msg.task_id}`, "system");
  } else if (type === "task_complete") {
    console.log("[task]", "complete:", msg.task_id, msg.status, msg.summary);
    addLog(`Task complete: ${msg.summary || msg.status}`, "system");
  } else if (type === "action_pending") {
    const action = msg.action as { id?: number; title?: string; risk?: string };
    addLog(`Confirmation needed: ${action.title || "external action"}`, "system");
    showToast(`Confirmation needed: ${action.title || "external action"}`, "info", 7000);
    refreshPendingActions();
  }
});

// ---------------------------------------------------------------------------
// Kick off
// ---------------------------------------------------------------------------

// Start listening after a brief delay for the orb to render
setTimeout(() => {
  voiceInput.start();
  transition("listening");
}, 1000);

// Resume AudioContext on ANY user interaction (browser autoplay policy)
function ensureAudioContext() {
  const ctx = audioPlayer.getAnalyser().context as AudioContext;
  if (ctx.state === "suspended") {
    ctx.resume().then(() => console.log("[audio] context resumed"));
  }
}
document.addEventListener("click", ensureAudioContext);
document.addEventListener("touchstart", ensureAudioContext);
document.addEventListener("keydown", ensureAudioContext, { once: true });

// Try to resume audio context on load
ensureAudioContext();

// ---------------------------------------------------------------------------
// UI Controls
// ---------------------------------------------------------------------------

const btnMute = document.getElementById("btn-mute")!;
const btnMenu = document.getElementById("btn-menu")!;
const menuDropdown = document.getElementById("menu-dropdown")!;
const btnRestart = document.getElementById("btn-restart")!;
const btnFixSelf = document.getElementById("btn-fix-self")!;

btnMute.addEventListener("click", (e) => {
  e.stopPropagation();
  isMuted = !isMuted;
  btnMute.classList.toggle("muted", isMuted);
  if (isMuted) {
    voiceInput.pause();
    transition("idle");
  } else {
    voiceInput.resume();
    transition("listening");
  }
  updateStatePill(currentState);
  showToast(isMuted ? "Microphone muted" : "Microphone live", isMuted ? "info" : "success", 2000);
});

btnMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  menuDropdown.style.display = menuDropdown.style.display === "none" ? "block" : "none";
});

document.addEventListener("click", () => {
  menuDropdown.style.display = "none";
});

btnRestart.addEventListener("click", async (e) => {
  e.stopPropagation();
  menuDropdown.style.display = "none";
  statusEl.textContent = "restarting...";
  try {
    await fetch("/api/restart", { method: "POST" });
    // Wait a few seconds then reload
    setTimeout(() => window.location.reload(), 4000);
  } catch {
    statusEl.textContent = "restart failed";
  }
});

btnFixSelf.addEventListener("click", (e) => {
  e.stopPropagation();
  menuDropdown.style.display = "none";
  // Activate work mode on the WebSocket session (JARVIS becomes Claude Code's voice)
  socket.send({ type: "fix_self" });
  statusEl.textContent = "entering work mode...";
});

// Settings button
const btnSettings = document.getElementById("btn-settings")!;
btnSettings.addEventListener("click", (e) => {
  e.stopPropagation();
  menuDropdown.style.display = "none";
  openSettings();
});

// First-time setup detection — check after a short delay for server readiness
setTimeout(() => {
  checkFirstTimeSetup();
}, 2000);


// ---------------------------------------------------------------------------
// MARK XL-inspired Mission Control: metrics, rapid actions, file intake
// ---------------------------------------------------------------------------

quickActions.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-command]");
  if (!button) return;
  sendCommand(button.dataset.command || button.textContent || "", "quick");
});

async function uploadFile(file: File) {
  const maxBytes = 512 * 1024;
  if (file.size > maxBytes) {
    showError(`${file.name} is too large for quick intake (512 KB limit).`);
    addLog(`Rejected ${file.name}: larger than 512 KB`, "system");
    return;
  }

  const content = await file.text();
  const res = await fetch("/api/intake-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, mime_type: file.type || "text/plain", content }),
  });
  const data = await res.json();
  if (!res.ok) {
    showError(data.error || `Could not ingest ${file.name}.`);
    return;
  }
  const prompt = `I uploaded ${data.name}. Summarize it, identify risks or useful next actions, and remember the important context.`;
  addLog(`File ingested: ${data.name}`, "system");
  showToast(`Ingested ${data.name}`, "success");
  sendCommand(prompt, "file");
}

["dragenter", "dragover"].forEach((name) => {
  dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((name) => {
  dropZone.addEventListener(name, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});

dropZone.addEventListener("drop", async (event) => {
  const files = Array.from(event.dataTransfer?.files || []);
  for (const file of files.slice(0, 4)) {
    await uploadFile(file);
  }
});

addLog("Mission control online.", "system");
refreshSystemMetrics();
refreshUsage();
refreshArtifacts();
refreshPendingActions();
setInterval(refreshSystemMetrics, 5000);
setInterval(refreshUsage, 8000);
setInterval(refreshArtifacts, 15000);
setInterval(refreshPendingActions, 10000);


// ---------------------------------------------------------------------------
// Artifacts + guardrail action queue
// ---------------------------------------------------------------------------

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\'": "&#039;" }[ch] || ch));
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "--";
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${Math.max(0, Math.round(bytes))} B`;
}

async function refreshArtifacts() {
  try {
    const res = await fetch("/api/artifacts");
    const data = await res.json();
    const artifacts = (data.artifacts || []) as Array<{ name: string; size: number; modified_at: number; download_url: string }>;
    if (artifacts.length === 0) {
      artifactList.innerHTML = `<div class="mini-row"><strong>No artifacts yet</strong><small>Executable skills will appear here.</small></div>`;
      return;
    }
    artifactList.innerHTML = artifacts.slice(0, 5).map((a) => `
      <div class="mini-row">
        <strong>${escapeHtml(a.name)}</strong>
        <small>${formatBytes(Number(a.size))} · ${new Date(Number(a.modified_at) * 1000).toLocaleString()}</small>
        <div class="mini-actions"><button data-open-artifact="${escapeHtml(a.download_url)}">Open</button><button data-copy-artifact="${escapeHtml(a.name)}">Copy name</button></div>
      </div>`).join("");
  } catch {
    artifactList.innerHTML = `<div class="mini-row"><strong>Artifacts unavailable</strong></div>`;
  }
}

async function refreshPendingActions() {
  try {
    const res = await fetch("/api/action-log?status=pending_confirmation&limit=10");
    const data = await res.json();
    const actions = (data.actions || []) as Array<{ id: number; title: string; risk: string; created_at: number }>;
    if (actions.length === 0) {
      pendingActions.innerHTML = `<div class="mini-row"><strong>No pending actions</strong><small>Outbound tool calls pause here before execution.</small></div>`;
      return;
    }
    pendingActions.innerHTML = actions.map((a) => `
      <div class="mini-row">
        <strong>${escapeHtml(a.title)}</strong>
        <small>${escapeHtml(a.risk.toUpperCase())} risk · ${new Date(Number(a.created_at) * 1000).toLocaleTimeString()}</small>
        <div class="mini-actions"><button class="danger" data-confirm-action="${a.id}">Confirm</button><button data-cancel-action="${a.id}">Cancel</button></div>
      </div>`).join("");
  } catch {
    pendingActions.innerHTML = `<div class="mini-row"><strong>Action guard unavailable</strong></div>`;
  }
}

document.getElementById("btn-artifacts-refresh")?.addEventListener("click", refreshArtifacts);
document.getElementById("btn-action-refresh")?.addEventListener("click", refreshPendingActions);

artifactList.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const open = target.closest<HTMLButtonElement>("button[data-open-artifact]");
  const copy = target.closest<HTMLButtonElement>("button[data-copy-artifact]");
  if (open) window.open(open.dataset.openArtifact, "_blank");
  if (copy) {
    await navigator.clipboard.writeText(copy.dataset.copyArtifact || "");
    showToast("Artifact name copied", "success");
  }
});

pendingActions.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const confirmBtn = target.closest<HTMLButtonElement>("button[data-confirm-action]");
  const cancelBtn = target.closest<HTMLButtonElement>("button[data-cancel-action]");
  const id = confirmBtn?.dataset.confirmAction || cancelBtn?.dataset.cancelAction;
  if (!id) return;
  const path = confirmBtn ? `/api/action-log/${id}/confirm` : `/api/action-log/${id}/cancel`;
  const res = await fetch(path, { method: "POST" });
  if (!res.ok) {
    showToast(confirmBtn ? "Confirmation failed" : "Cancel failed", "error");
    return;
  }
  showToast(confirmBtn ? "Action confirmed" : "Action cancelled", confirmBtn ? "success" : "info");
  refreshPendingActions();
});

// ---------------------------------------------------------------------------
// Text command bar — type to JARVIS
// ---------------------------------------------------------------------------

const commandBar = document.getElementById("command-bar") as HTMLFormElement;
const commandInput = document.getElementById("command-input") as HTMLInputElement;

commandBar.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = commandInput.value.trim();
  if (!text) return;
  audioPlayer.stop();
  sendCommand(text, "text");
  commandInput.value = "";
});

// ---------------------------------------------------------------------------
// Activity log controls — copy / clear
// ---------------------------------------------------------------------------

const btnLogCopy = document.getElementById("btn-log-copy")!;
const btnLogClear = document.getElementById("btn-log-clear")!;

function clearLog() {
  eventLog.innerHTML = "";
}

btnLogClear.addEventListener("click", (e) => {
  e.stopPropagation();
  clearLog();
});

btnLogCopy.addEventListener("click", async (e) => {
  e.stopPropagation();
  const rows = Array.from(eventLog.querySelectorAll<HTMLElement>(".log-row")).reverse();
  if (rows.length === 0) {
    showToast("Activity log is empty", "info");
    return;
  }
  const text = rows
    .map((row) => {
      const time = row.querySelector("span")?.textContent ?? "";
      const body = row.querySelector("p")?.textContent ?? "";
      return `[${time}] ${body}`;
    })
    .join("\n");
  try {
    await navigator.clipboard.writeText(text);
    showToast("Activity log copied", "success");
  } catch {
    showToast("Clipboard unavailable", "error");
  }
});

// ---------------------------------------------------------------------------
// Keyboard shortcuts + help overlay
// ---------------------------------------------------------------------------

const shortcutsOverlay = document.getElementById("shortcuts-overlay")!;
const btnHelp = document.getElementById("btn-help")!;

function toggleShortcuts(force?: boolean) {
  const show = force ?? shortcutsOverlay.style.display === "none";
  shortcutsOverlay.style.display = show ? "flex" : "none";
}

btnHelp.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleShortcuts();
});

shortcutsOverlay.addEventListener("click", () => toggleShortcuts(false));

document.addEventListener("keydown", (event) => {
  const typing =
    document.activeElement === commandInput ||
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement;

  // Escape always works: stop audio, close overlays/panels, blur input.
  if (event.key === "Escape") {
    if (shortcutsOverlay.style.display !== "none") {
      toggleShortcuts(false);
      return;
    }
    if (menuDropdown.style.display !== "none") {
      menuDropdown.style.display = "none";
      return;
    }
    if (typing) {
      (document.activeElement as HTMLElement).blur();
      return;
    }
    audioPlayer.stop();
    transition("idle");
    return;
  }

  if (typing) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  switch (event.key) {
    case "/":
      event.preventDefault();
      commandInput.focus();
      break;
    case "m":
    case "M":
      (btnMute as HTMLElement).click();
      break;
    case "l":
    case "L":
      clearLog();
      break;
    case ",":
      openSettings();
      break;
    case "?":
      toggleShortcuts();
      break;
  }
});
