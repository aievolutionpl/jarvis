/**
 * JARVIS — Settings Panel
 *
 * Overlay panel for API keys, connection status, preferences, and system info.
 * Slides in from the right with glass-morphism styling.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiProvider {
  id: string;
  name: string;
  env_key: string;
  category: string;
  description: string;
  placeholder: string;
  docs_url: string;
  optional: boolean;
  configured: boolean;
}

interface SkillPack {
  id: string;
  name: string;
  category: string;
  description: string;
  bundled: boolean;
  install_hint: string;
}

interface Skill {
  slug: string;
  name: string;
  category: string;
  description: string;
  when_to_use: string;
  instructions: string;
  executable: boolean;
  enabled: boolean;
}

interface SkillCategory {
  category: string;
  total: number;
  enabled: number;
}

interface McpServer {
  id: string;
  name: string;
  category: string;
  description: string;
  capabilities: string[];
  connected: boolean;
  status: string;
  auth_required: boolean;
  auth_present: boolean;
  docs_url: string;
}

interface StatusResponse {
  claude_code_installed: boolean;
  calendar_accessible: boolean;
  mail_accessible: boolean;
  notes_accessible: boolean;
  memory_count: number;
  task_count: number;
  server_port: number;
  uptime_seconds: number;
  platform: string;
  env_keys_set: {
    anthropic: boolean;
    fish_audio: boolean;
    fish_voice_id: boolean;
    user_name: string;
  };
  providers: ApiProvider[];
  skills: SkillPack[];
  skill_counts?: { total: number; enabled: number };
  mcp_connected?: number;
  onboarding?: { status: string; turns: number };
}

interface PreferencesResponse {
  user_name: string;
  honorific: string;
  calendar_accounts: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let panelEl: HTMLElement | null = null;
let isOpen = false;
let isFirstTimeSetup = false;
let setupStep = 0; // 0=anthropic, 1=fish, 2=name, 3=done

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json();
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// Panel HTML
// ---------------------------------------------------------------------------

function buildPanelHTML(): string {
  return `
    <div class="settings-backdrop" id="settings-backdrop"></div>
    <div class="settings-panel" id="settings-panel-inner">
      <div class="settings-header">
        <h2>AI Evolution Labs · JARVIS</h2>
        <button class="settings-close" id="settings-close">&times;</button>
      </div>

      <div class="settings-welcome" id="settings-welcome" style="display:none">
        <div class="onboarding-hero">
          <a class="onboarding-kicker" href="https://aievolutionlabs.io/" target="_blank" rel="noreferrer">AI Evolution Labs</a>
          <strong>Install, connect, and launch JARVIS.</strong>
          <p>A guided setup for local keys, voice, skills, tools, profile, and a desktop shortcut — no manual file editing required.</p>
          <div class="onboarding-stats" aria-label="Setup checklist">
            <span><b>BYOK</b> Local .env</span>
            <span><b>100</b> Skills</span>
            <span><b>Desktop</b> Shortcut</span>
          </div>
        </div>
        <div class="onboarding-steps" id="onboarding-steps">
          <span class="active">1 Keys</span><span>2 Skills</span><span>3 Tools</span><span>4 Profile</span><span>5 Launch</span>
        </div>
      </div>

      <div class="settings-body">

        <!-- API Keys -->
        <section class="settings-section" id="section-api-keys">
          <h3>API Keys</h3>
          <p class="section-note">Required: Anthropic for the assistant brain. Recommended: Fish Audio for the JARVIS voice. Optional providers can be added now or later.</p>

          <div class="settings-field">
            <label>Anthropic API Key</label>
            <div class="settings-input-row">
              <input type="password" id="input-anthropic-key" placeholder="sk-ant-..." />
              <button class="settings-btn" id="btn-test-anthropic">Test</button>
              <span class="status-dot" id="status-anthropic"></span>
            </div>
          </div>

          <div class="settings-field">
            <label>Fish Audio API Key</label>
            <div class="settings-input-row">
              <input type="password" id="input-fish-key" placeholder="Fish Audio key..." />
              <button class="settings-btn" id="btn-test-fish">Test</button>
              <span class="status-dot" id="status-fish"></span>
            </div>
          </div>

          <div class="settings-field">
            <label>Fish Voice ID</label>
            <div class="settings-input-row">
              <input type="text" id="input-fish-voice-id" placeholder="612b878b113047d9a770c069c8b4fdfe" />
              <button class="settings-btn" id="btn-save-voice-id">Save</button>
            </div>
          </div>

          <div class="provider-grid" id="provider-grid"></div>

          <div class="settings-actions">
            <button class="settings-btn primary" id="btn-save-keys">Save Keys</button>
          </div>
        </section>

        <!-- Skills -->
        <section class="settings-section" id="section-skills">
          <h3>Skills <span class="skills-count" id="skills-count"></span></h3>
          <p class="section-note">Enable the capabilities JARVIS should be ready to use. Active skills are loaded into context so he can draft, research, code, plan, automate, and produce files when a task needs it.</p>
          <input type="search" id="skills-search" class="skills-search" placeholder="Search 100 skills — invoice, email, hiring..." />
          <div class="skills-chips" id="skills-chips"></div>
          <div class="skills-list" id="skills-list"></div>
        </section>

        <!-- Connected Tools (MCP) -->
        <section class="settings-section" id="section-mcp">
          <h3>Connected Tools <span class="skills-count" id="mcp-count"></span></h3>
          <p class="section-note">Connect external tools over MCP so JARVIS can reach email, docs, CRM, databases, and team systems. Add matching API keys in Settings where a tool needs auth.</p>
          <div class="mcp-list" id="mcp-list"></div>
        </section>

        <!-- Connection Status -->
        <section class="settings-section" id="section-status">
          <h3>Connection Status</h3>
          <div class="status-grid">
            <div class="status-row"><span class="status-dot" id="status-claude-cli"></span><span>Claude Code CLI</span></div>
            <div class="status-row"><span class="status-dot" id="status-calendar"></span><span>Apple Calendar</span></div>
            <div class="status-row"><span class="status-dot" id="status-mail"></span><span>Apple Mail</span></div>
            <div class="status-row"><span class="status-dot" id="status-notes"></span><span>Apple Notes</span></div>
            <div class="status-row"><span class="status-dot" id="status-server"></span><span>Server</span><span class="status-detail" id="status-server-detail"></span></div>
          </div>
        </section>

        <!-- User Preferences -->
        <section class="settings-section" id="section-preferences">
          <h3>User Preferences</h3>

          <div class="settings-field">
            <label>Your Name</label>
            <input type="text" id="input-user-name" placeholder="Your name" />
          </div>

          <div class="settings-field">
            <label>Honorific</label>
            <select id="input-honorific">
              <option value="sir">Sir</option>
              <option value="ma'am">Ma'am</option>
              <option value="none">None</option>
            </select>
          </div>

          <div class="settings-field">
            <label>Calendar Accounts</label>
            <textarea id="input-calendar-accounts" rows="2" placeholder="auto (or comma-separated emails)"></textarea>
          </div>

          <div class="settings-actions">
            <button class="settings-btn primary" id="btn-save-prefs">Save Preferences</button>
          </div>
        </section>

        <!-- Launch -->
        <section class="settings-section launch-section" id="section-launch">
          <h3>Launch Checklist</h3>
          <p class="section-note">You are ready to start commanding JARVIS. Try one of these examples after setup:</p>
          <div class="example-grid">
            <button type="button" data-example-command="Summarize today's calendar and unread email priorities.">Daily executive brief</button>
            <button type="button" data-example-command="Scan my screen and explain the next best action.">Screen-aware help</button>
            <button type="button" data-example-command="Review this project and suggest the highest-impact improvement.">Codebase self-review</button>
            <button type="button" data-example-command="Create a concise research brief with sources about my market.">Research brief</button>
            <button type="button" data-example-command="Turn this idea into a task plan with milestones.">Project plan</button>
            <button type="button" data-example-command="Draft a polished client email from these notes.">Client email</button>
          </div>
          <div class="desktop-shortcut-note">
            <strong>Desktop shortcut</strong>
            <span>On Windows, <code>start.ps1</code> creates or refreshes a <em>JARVIS by AI Evolution Labs</em> shortcut on the user's desktop.</span>
          </div>
        </section>

        <!-- System Info -->
        <section class="settings-section" id="section-sysinfo">
          <h3>System Info</h3>
          <div class="sysinfo-grid">
            <div class="sysinfo-row"><span class="sysinfo-label">Memory entries</span><span id="sysinfo-memory">--</span></div>
            <div class="sysinfo-row"><span class="sysinfo-label">Tasks</span><span id="sysinfo-tasks">--</span></div>
            <div class="sysinfo-row"><span class="sysinfo-label">Server port</span><span id="sysinfo-port">--</span></div>
            <div class="sysinfo-row"><span class="sysinfo-label">Uptime</span><span id="sysinfo-uptime">--</span></div>
            <div class="sysinfo-row"><span class="sysinfo-label">Platform</span><span id="sysinfo-platform">--</span></div>
          </div>
        </section>

        <!-- Setup Navigation (first-time only) -->
        <div class="setup-nav" id="setup-nav" style="display:none">
          <button class="settings-btn primary" id="btn-setup-next">Next</button>
        </div>

      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Panel lifecycle
// ---------------------------------------------------------------------------

function createPanel(): HTMLElement {
  const container = document.createElement("div");
  container.id = "settings-container";
  container.innerHTML = buildPanelHTML();
  document.body.appendChild(container);
  return container;
}

function setDotStatus(id: string, status: "green" | "red" | "yellow" | "off") {
  const dot = document.getElementById(id);
  if (!dot) return;
  dot.className = "status-dot";
  if (status !== "off") dot.classList.add(`status-${status}`);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char] || char));
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function renderProviders(providers: ApiProvider[]) {
  const grid = document.getElementById("provider-grid");
  if (!grid) return;
  grid.innerHTML = providers
    .filter((provider) => !["anthropic", "fish_audio"].includes(provider.id))
    .map((provider) => `
      <div class="provider-card ${provider.configured ? "configured" : ""}">
        <div class="provider-card-header">
          <span class="status-dot ${provider.configured ? "status-green" : ""}" id="status-provider-${escapeHtml(provider.id)}"></span>
          <div>
            <strong>${escapeHtml(provider.name)}</strong>
            <small>${escapeHtml(provider.category)}</small>
          </div>
          ${provider.docs_url ? `<a href="${escapeHtml(provider.docs_url)}" target="_blank" rel="noreferrer">Docs</a>` : ""}
        </div>
        <p>${escapeHtml(provider.description)}</p>
        <input type="password" data-provider-key="${escapeHtml(provider.env_key)}" placeholder="${escapeHtml(provider.placeholder || provider.env_key)}" />
      </div>
    `)
    .join("");
}

// --- Skills browser --------------------------------------------------------

let allSkills: Skill[] = [];
let skillCategories: SkillCategory[] = [];
let activeCategory = "All";
let skillSearchTerm = "";

async function loadSkills() {
  try {
    const data = await apiGet<{ skills: Skill[]; categories: SkillCategory[]; counts: { total: number; enabled: number } }>("/api/skills");
    allSkills = data.skills || [];
    skillCategories = data.categories || [];
    const countEl = document.getElementById("skills-count");
    if (countEl) countEl.textContent = `${data.counts.enabled}/${data.counts.total} active`;
    renderChips();
    renderSkillsList();
  } catch (e) {
    console.error("[settings] failed to load skills:", e);
  }
}

function renderChips() {
  const chips = document.getElementById("skills-chips");
  if (!chips) return;
  const cats = ["All", ...skillCategories.map((c) => c.category)];
  chips.innerHTML = cats
    .map((c) => {
      const meta = skillCategories.find((x) => x.category === c);
      const count = c === "All" ? "" : ` <em>${meta?.enabled ?? 0}/${meta?.total ?? 0}</em>`;
      return `<button class="skill-chip ${c === activeCategory ? "active" : ""}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}${count}</button>`;
    })
    .join("");
}

function renderSkillsList() {
  const list = document.getElementById("skills-list");
  if (!list) return;
  const term = skillSearchTerm.toLowerCase();
  const filtered = allSkills.filter((s) => {
    const matchesCat = activeCategory === "All" || s.category === activeCategory;
    const matchesTerm =
      !term ||
      `${s.name} ${s.description} ${s.instructions} ${s.category}`.toLowerCase().includes(term);
    return matchesCat && matchesTerm;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<p class="section-note">No skills match "${escapeHtml(skillSearchTerm)}".</p>`;
    return;
  }

  list.innerHTML = filtered
    .map(
      (s) => `
    <div class="skill-row ${s.enabled ? "enabled" : ""}">
      <div class="skill-row-main">
        <strong>${escapeHtml(s.name)}${s.executable ? ' <span class="skill-exec">runs</span>' : ""}</strong>
        <small>${escapeHtml(s.category)}</small>
        <p>${escapeHtml(s.description)}</p>
      </div>
      <button class="skill-toggle ${s.enabled ? "on" : ""}" data-slug="${escapeHtml(s.slug)}" role="switch" aria-checked="${s.enabled}" aria-label="Toggle ${escapeHtml(s.name)}"><span></span></button>
    </div>`
    )
    .join("");
}

async function toggleSkill(slug: string) {
  const skill = allSkills.find((s) => s.slug === slug);
  if (!skill) return;
  const next = !skill.enabled;
  skill.enabled = next; // optimistic
  renderSkillsList();
  try {
    await apiPost(`/api/skills/${slug}/toggle`, { enabled: next });
    await loadSkills();
  } catch {
    skill.enabled = !next;
    renderSkillsList();
  }
}

// --- MCP tools -------------------------------------------------------------

async function loadMcp() {
  try {
    const data = await apiGet<{ servers: McpServer[] }>("/api/mcp");
    const servers = data.servers || [];
    const countEl = document.getElementById("mcp-count");
    if (countEl) countEl.textContent = `${servers.filter((s) => s.connected).length} connected`;
    renderMcp(servers);
  } catch (e) {
    console.error("[settings] failed to load MCP servers:", e);
  }
}

function renderMcp(servers: McpServer[]) {
  const list = document.getElementById("mcp-list");
  if (!list) return;
  list.innerHTML = servers
    .map(
      (s) => `
    <div class="mcp-card ${s.connected ? "connected" : ""}">
      <div class="mcp-card-head">
        <span class="status-dot ${s.connected ? "status-green" : ""}"></span>
        <div>
          <strong>${escapeHtml(s.name)}</strong>
          <small>${escapeHtml(s.category)}${s.capabilities.length ? " · " + escapeHtml(s.capabilities.join(", ")) : ""}</small>
        </div>
        <button class="settings-btn mcp-btn" data-mcp="${escapeHtml(s.id)}" data-connected="${s.connected}">${s.connected ? "Disconnect" : "Connect"}</button>
      </div>
      <p>${escapeHtml(s.description)}</p>
      ${s.connected && s.auth_required && !s.auth_present ? `<small class="mcp-warn">Needs an API key — add it in the Keys section.</small>` : ""}
    </div>`
    )
    .join("");
}

async function toggleMcp(id: string, connected: boolean) {
  try {
    await apiPost(`/api/mcp/${id}/${connected ? "disconnect" : "connect"}`, { config: {} });
    await loadMcp();
  } catch (e) {
    console.error("[settings] MCP toggle failed:", e);
  }
}

async function loadStatus() {
  try {
    const status = await apiGet<StatusResponse>("/api/settings/status");

    setDotStatus("status-claude-cli", status.claude_code_installed ? "green" : "red");
    setDotStatus("status-calendar", status.calendar_accessible ? "green" : "red");
    setDotStatus("status-mail", status.mail_accessible ? "green" : "red");
    setDotStatus("status-notes", status.notes_accessible ? "green" : "red");
    setDotStatus("status-server", "green");

    const serverDetail = document.getElementById("status-server-detail");
    if (serverDetail) serverDetail.textContent = `port ${status.server_port} | up ${formatUptime(status.uptime_seconds)}`;

    // API key status dots
    setDotStatus("status-anthropic", status.env_keys_set.anthropic ? "green" : "red");
    setDotStatus("status-fish", status.env_keys_set.fish_audio ? "green" : "red");

    renderProviders(status.providers || []);
    loadSkills();
    loadMcp();

    // System info
    const memEl = document.getElementById("sysinfo-memory");
    if (memEl) memEl.textContent = String(status.memory_count);
    const taskEl = document.getElementById("sysinfo-tasks");
    if (taskEl) taskEl.textContent = String(status.task_count);
    const portEl = document.getElementById("sysinfo-port");
    if (portEl) portEl.textContent = String(status.server_port);
    const upEl = document.getElementById("sysinfo-uptime");
    if (upEl) upEl.textContent = formatUptime(status.uptime_seconds);
    const platformEl = document.getElementById("sysinfo-platform");
    if (platformEl) platformEl.textContent = status.platform || "unknown";

    return status;
  } catch (e) {
    console.error("[settings] failed to load status:", e);
    setDotStatus("status-server", "red");
    return null;
  }
}

async function loadPreferences() {
  try {
    const prefs = await apiGet<PreferencesResponse>("/api/settings/preferences");
    const nameEl = document.getElementById("input-user-name") as HTMLInputElement;
    const honEl = document.getElementById("input-honorific") as HTMLSelectElement;
    const calEl = document.getElementById("input-calendar-accounts") as HTMLTextAreaElement;
    if (nameEl) nameEl.value = prefs.user_name || "";
    if (honEl) honEl.value = prefs.honorific || "sir";
    if (calEl) calEl.value = prefs.calendar_accounts || "auto";
  } catch (e) {
    console.error("[settings] failed to load preferences:", e);
  }
}

function wireEvents() {
  // Close
  document.getElementById("settings-close")?.addEventListener("click", closeSettings);
  document.getElementById("settings-backdrop")?.addEventListener("click", closeSettings);

  // Save keys
  document.getElementById("btn-save-keys")?.addEventListener("click", async () => {
    const anthropicKey = (document.getElementById("input-anthropic-key") as HTMLInputElement).value.trim();
    const fishKey = (document.getElementById("input-fish-key") as HTMLInputElement).value.trim();

    if (anthropicKey) {
      await apiPost("/api/settings/keys", { key_name: "ANTHROPIC_API_KEY", key_value: anthropicKey });
    }
    if (fishKey) {
      await apiPost("/api/settings/keys", { key_name: "FISH_API_KEY", key_value: fishKey });
    }

    const providerInputs = Array.from(document.querySelectorAll<HTMLInputElement>("[data-provider-key]"));
    await Promise.all(providerInputs.map((input) => {
      const value = input.value.trim();
      if (!value) return Promise.resolve();
      return apiPost("/api/settings/keys", { key_name: input.dataset.providerKey, key_value: value });
    }));

    await loadStatus();
  });

  // Save voice ID
  document.getElementById("btn-save-voice-id")?.addEventListener("click", async () => {
    const voiceId = (document.getElementById("input-fish-voice-id") as HTMLInputElement).value.trim();
    if (voiceId) {
      await apiPost("/api/settings/keys", { key_name: "FISH_VOICE_ID", key_value: voiceId });
    }
  });

  // Test Anthropic
  document.getElementById("btn-test-anthropic")?.addEventListener("click", async () => {
    setDotStatus("status-anthropic", "yellow");
    const key = (document.getElementById("input-anthropic-key") as HTMLInputElement).value.trim();
    try {
      const result = await apiPost<{ valid: boolean; error?: string }>("/api/settings/test-anthropic", { key_value: key || undefined });
      setDotStatus("status-anthropic", result.valid ? "green" : "red");
    } catch {
      setDotStatus("status-anthropic", "red");
    }
  });

  // Test Fish
  document.getElementById("btn-test-fish")?.addEventListener("click", async () => {
    setDotStatus("status-fish", "yellow");
    const key = (document.getElementById("input-fish-key") as HTMLInputElement).value.trim();
    try {
      const result = await apiPost<{ valid: boolean; error?: string }>("/api/settings/test-fish", { key_value: key || undefined });
      setDotStatus("status-fish", result.valid ? "green" : "red");
    } catch {
      setDotStatus("status-fish", "red");
    }
  });

  // Save preferences
  document.getElementById("btn-save-prefs")?.addEventListener("click", async () => {
    const user_name = (document.getElementById("input-user-name") as HTMLInputElement).value.trim();
    const honorific = (document.getElementById("input-honorific") as HTMLSelectElement).value;
    const calendar_accounts = (document.getElementById("input-calendar-accounts") as HTMLTextAreaElement).value.trim();
    await apiPost("/api/settings/preferences", { user_name, honorific, calendar_accounts });
    await loadStatus();
  });

  // Setup next button
  document.getElementById("btn-setup-next")?.addEventListener("click", advanceSetup);

  // Skills search
  document.getElementById("skills-search")?.addEventListener("input", (e) => {
    skillSearchTerm = (e.target as HTMLInputElement).value;
    renderSkillsList();
  });

  // Category chips (delegated)
  document.getElementById("skills-chips")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-cat]");
    if (!btn) return;
    activeCategory = btn.dataset.cat || "All";
    renderChips();
    renderSkillsList();
  });

  // Skill toggles (delegated)
  document.getElementById("skills-list")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-slug]");
    if (!btn) return;
    toggleSkill(btn.dataset.slug || "");
  });

  // Launch examples (delegated)
  document.getElementById("section-launch")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-example-command]");
    if (!btn) return;
    const input = document.getElementById("command-input") as HTMLInputElement | null;
    if (input) {
      input.value = btn.dataset.exampleCommand || "";
      input.focus();
    }
    closeSettings();
  });

  // MCP connect/disconnect (delegated)
  document.getElementById("mcp-list")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-mcp]");
    if (!btn) return;
    toggleMcp(btn.dataset.mcp || "", btn.dataset.connected === "true");
  });
}

// ---------------------------------------------------------------------------
// First-time setup wizard
// ---------------------------------------------------------------------------

function enterSetupMode() {
  isFirstTimeSetup = true;
  setupStep = 0;

  const welcome = document.getElementById("settings-welcome");
  if (welcome) welcome.style.display = "block";

  const nav = document.getElementById("setup-nav");
  if (nav) nav.style.display = "flex";

  // Hide sections except API keys
  showSetupStep(0);
}

const ALL_SECTIONS = ["section-api-keys", "section-skills", "section-mcp", "section-status", "section-preferences", "section-launch", "section-sysinfo"];
// Which section each setup step reveals (0=keys, 1=skills, 2=tools, 3=profile, 4=launch).
const SETUP_STEP_SECTION: Record<number, string> = {
  0: "section-api-keys",
  1: "section-skills",
  2: "section-mcp",
  3: "section-preferences",
  4: "section-launch",
};

function showSetupStep(step: number) {
  document.querySelectorAll("#onboarding-steps span").forEach((item, index) => {
    item.classList.toggle("active", index === Math.min(step, 4));
  });
  const visible = SETUP_STEP_SECTION[step];
  ALL_SECTIONS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = id === visible ? "" : "none";
  });

  const nextBtn = document.getElementById("btn-setup-next");
  if (nextBtn) {
    const labels: Record<number, string> = {
      0: "Next: Skills",
      1: "Next: Tools",
      2: "Next: Profile",
      3: "Next: Launch",
      4: "Finish Setup",
    };
    nextBtn.textContent = labels[step] || "Finish Setup";
  }
}

async function advanceSetup() {
  setupStep++;
  if (setupStep >= 5) {
    // Done — reveal everything and close
    isFirstTimeSetup = false;
    const welcome = document.getElementById("settings-welcome");
    if (welcome) welcome.style.display = "none";
    const nav = document.getElementById("setup-nav");
    if (nav) nav.style.display = "none";

    ALL_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });

    closeSettings();
    return;
  }
  showSetupStep(setupStep);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function openSettings() {
  if (isOpen) return;
  isOpen = true;

  if (!panelEl) {
    panelEl = createPanel();
    wireEvents();
  }

  panelEl.style.display = "block";

  // Trigger animation
  requestAnimationFrame(() => {
    panelEl!.classList.add("open");
  });

  // Load data
  const status = await loadStatus();
  await loadPreferences();

  // Check for first-time setup
  if (status && !status.env_keys_set.anthropic) {
    enterSetupMode();
  }
}

export function closeSettings() {
  if (!panelEl || !isOpen) return;
  isOpen = false;
  panelEl.classList.remove("open");
  setTimeout(() => {
    if (panelEl) panelEl.style.display = "none";
  }, 300);
}

export function isSettingsOpen(): boolean {
  return isOpen;
}

/**
 * Check if first-time setup is needed and auto-open.
 */
export async function checkFirstTimeSetup(): Promise<boolean> {
  try {
    const status = await apiGet<StatusResponse>("/api/settings/status");
    if (!status.env_keys_set.anthropic) {
      openSettings();
      return true;
    }
  } catch {
    // Server not ready yet, skip
  }
  return false;
}
