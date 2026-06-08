"""
JARVIS Skills System — an installable catalog of agent capabilities.

A "skill" is a curated capability definition (inspired by Claude Agent Skills /
SKILL.md): a name, the situations it applies to, and concrete instructions the
agent loads into context when the skill is enabled. This lets JARVIS perform a
wide range of small-business tasks without bespoke code for each one.

Hybrid model:
- Most skills are *prompt-based*: enabling them injects their instructions into
  the system prompt so JARVIS knows how to do the task well.
- A few flagship skills are *executable*: they have a real Python handler that
  produces an artifact (an invoice, an agenda, an SOP) saved under data/artifacts/.

Everything is stored in SQLite so enabled skills persist across restarts.
"""

from __future__ import annotations

import logging
import sqlite3
import time
from pathlib import Path

log = logging.getLogger("jarvis.skills")

DB_PATH = Path(__file__).parent / "data" / "jarvis.db"
ARTIFACTS_DIR = Path(__file__).parent / "data" / "artifacts"


def _get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


# ---------------------------------------------------------------------------
# Skill catalog — ~100 small-business capabilities across 15 categories.
# Each entry: (slug, name, category, when_to_use, instructions)
# A handful are marked executable via EXECUTABLE_HANDLERS below.
# ---------------------------------------------------------------------------

# fmt: off
_CATALOG: list[tuple[str, str, str, str, str]] = [
    # --- Sales & CRM ---
    ("lead-qualification", "Lead Qualification", "Sales & CRM", "qualifying an inbound lead or prospect", "Score the lead against BANT (Budget, Authority, Need, Timeline). Ask only the missing pieces, then give a hot/warm/cold verdict and the recommended next step."),
    ("cold-email-outreach", "Cold Email Outreach", "Sales & CRM", "writing a first-touch cold email to a prospect", "Open with a specific, researched hook about them — never 'I hope this finds you well'. One value point, one soft call to action, under 120 words."),
    ("sales-followup", "Sales Follow-up", "Sales & CRM", "following up after no reply or a meeting", "Reference the prior touch, add one new piece of value, and propose a concrete next step with a date. Keep it short and easy to say yes to."),
    ("proposal-writing", "Proposal Writing", "Sales & CRM", "drafting a sales proposal or statement of work", "Lead with the client's problem in their words, then scope, deliverables, timeline, and price. Tie every line item to an outcome they care about."),
    ("quote-generation", "Quote Generation", "Sales & CRM", "producing a price quote", "List line items with quantity, unit price, and total. Note assumptions, validity window, and payment terms. Offer a good/better/best option when sensible."),
    ("crm-update", "CRM Note Logging", "Sales & CRM", "logging contact notes or deal updates", "Capture who, what was discussed, sentiment, next action, and owner. Write it so a colleague could pick up the deal cold."),
    ("discovery-call-prep", "Discovery Call Prep", "Sales & CRM", "preparing for a discovery or sales call", "Research the company, draft 5-7 open discovery questions, anticipate two objections, and define the single outcome that makes the call a success."),
    ("objection-handling", "Objection Handling", "Sales & CRM", "responding to a sales objection", "Acknowledge the concern, reframe with evidence, and redirect to value. Never argue — isolate the real objection first."),
    ("pipeline-review", "Pipeline Review", "Sales & CRM", "reviewing or forecasting the sales pipeline", "Summarise deals by stage and value, flag stalled deals, weight the forecast by stage probability, and recommend where to focus this week."),

    # --- Marketing ---
    ("marketing-strategy", "Marketing Strategy", "Marketing", "building a marketing plan or strategy", "Define audience, positioning, channels, budget split, and 3 measurable goals. Recommend the two highest-leverage channels for a small budget."),
    ("seo-optimization", "SEO Optimization", "Marketing", "optimising content for search", "Cover title tag, meta description, H1, target keyword density, internal links, and intent match. Flag thin or keyword-stuffed sections."),
    ("keyword-research", "Keyword Research", "Marketing", "researching keywords for content or ads", "Group keywords by intent (informational/commercial/transactional), note rough difficulty, and recommend a small set of winnable, high-intent terms."),
    ("ad-copywriting", "Ad Copywriting", "Marketing", "writing paid ad copy for Google or Meta", "Match copy to platform limits, lead with the benefit, include one clear CTA, and provide 3 variants to test. State the angle of each."),
    ("landing-page-copy", "Landing Page Copy", "Marketing", "writing landing page copy", "Hero with a sharp value proposition, 3 benefit blocks, social proof, objection handling, and a single repeated CTA. Write for scanners."),
    ("email-newsletter", "Email Newsletter", "Marketing", "drafting an email newsletter or campaign", "Subject line plus preview text, one core idea, skimmable sections, and one primary CTA. Provide two subject-line options."),
    ("brand-voice", "Brand Voice Guide", "Marketing", "defining brand voice and tone", "Capture personality traits, do/don't word lists, tone-by-context examples, and a one-paragraph voice summary anyone can apply."),
    ("competitor-analysis", "Competitor Analysis", "Marketing", "analysing competitors", "Compare positioning, pricing, channels, and messaging in a table. End with gaps and the differentiation opportunity for the user."),
    ("campaign-planning", "Campaign Planning", "Marketing", "planning a marketing campaign", "Define goal, audience, offer, channels, timeline, assets needed, and success metric. Lay it out as a week-by-week plan."),
    ("press-release", "Press Release", "Marketing", "writing a press release", "Use the inverted-pyramid: headline, dateline, strong lede answering who/what/why, supporting quote, boilerplate, and contact. Keep it factual."),

    # --- Content & Social ---
    ("blog-writing", "Blog Writing", "Content & Social", "writing a blog post or article", "Hook, clear structure with subheads, scannable paragraphs, one takeaway per section, and a CTA. Match the requested tone and length."),
    ("social-media-calendar", "Social Content Calendar", "Content & Social", "planning a social media calendar", "Plan posts across the week by theme and format, balance promotional vs value content (roughly 1:4), and note the best posting cadence per platform."),
    ("social-post-writing", "Social Post Writing", "Content & Social", "writing individual social posts", "Hook in the first line, one idea, platform-appropriate length and tone, and a clear CTA or question. Offer a couple of variations."),
    ("linkedin-content", "LinkedIn Content", "Content & Social", "writing LinkedIn thought-leadership posts", "Open with a contrarian or personal hook, short punchy lines, one insight, and an engagement prompt. No corporate fluff or hashtag spam."),
    ("video-script", "Video Script", "Content & Social", "scripting a short-form or YouTube video", "Hook in the first 3 seconds, beat-by-beat structure with on-screen notes, and a payoff plus CTA. Mark pacing for short-form."),
    ("content-repurposing", "Content Repurposing", "Content & Social", "repurposing one piece of content across channels", "Take the source asset and adapt it into a thread, a LinkedIn post, a newsletter blurb, and a short-video script — keeping the core message, changing the format."),
    ("hashtag-strategy", "Hashtag Strategy", "Content & Social", "choosing hashtags", "Mix broad, niche, and branded tags, keep counts platform-appropriate, and avoid banned or overly generic tags. Explain the reasoning briefly."),
    ("caption-writing", "Caption Writing", "Content & Social", "writing captions for images or posts", "Match the visual, hook fast, keep it on-brand, and add a light CTA. Provide a short and a longer option."),
    ("newsletter-curation", "Newsletter Curation", "Content & Social", "curating links and content for a newsletter", "Select a tight set of items, write a one-line 'why it matters' for each, and order them by reader value. Add a short intro."),

    # --- Finance & Accounting ---
    ("invoice-creation", "Invoice Creation", "Finance & Accounting", "creating an invoice for a client", "Generate a clean invoice with seller/client details, numbered line items, subtotal, tax, total, due date, and payment terms. Use the executable generator to save a file."),
    ("expense-tracking", "Expense Tracking", "Finance & Accounting", "categorising or tracking expenses", "Categorise each expense (standard accounting buckets), flag anything unusual or non-deductible, and total by category."),
    ("budget-planning", "Budget Planning", "Finance & Accounting", "building a budget", "Lay out income, fixed costs, variable costs, and a buffer. Show monthly and annual views and flag the biggest controllable line items."),
    ("cashflow-forecast", "Cash Flow Forecast", "Finance & Accounting", "forecasting cash flow", "Project inflows and outflows by week or month, compute the running balance, and flag any periods that go negative with options to fix them."),
    ("financial-reporting", "Financial Reporting", "Finance & Accounting", "summarising monthly financials", "Summarise revenue, costs, margin, and the top movements vs last period. Lead with the numbers, then one paragraph of plain-English context."),
    ("pricing-strategy", "Pricing Strategy", "Finance & Accounting", "setting or reviewing pricing", "Analyse cost-plus, value, and competitor anchors. Recommend a price with the reasoning and a tiering structure if it fits."),
    ("bookkeeping-review", "Bookkeeping Review", "Finance & Accounting", "reviewing bookkeeping entries", "Check for miscategorised, duplicate, or missing entries, and reconcile totals. Produce a short list of items needing attention."),
    ("tax-prep-checklist", "Tax Prep Checklist", "Finance & Accounting", "organising for tax season", "Produce a document checklist by category, note common small-business deductions to confirm, and flag deadlines. Recommend confirming with an accountant."),
    ("payroll-summary", "Payroll Summary", "Finance & Accounting", "preparing a payroll summary", "Summarise gross, deductions, and net per person and in total, and note pay date and any anomalies. Keep figures clearly labelled."),

    # --- HR & Recruiting ---
    ("job-description", "Job Description", "HR & Recruiting", "writing a job description", "Cover role summary, responsibilities, must-have vs nice-to-have requirements, and what makes the role attractive. Keep it inclusive and jargon-light."),
    ("resume-screening", "Resume Screening", "HR & Recruiting", "screening resumes against a role", "Score each candidate against the must-haves, note strengths and gaps, and give an advance/hold/reject recommendation with a one-line reason."),
    ("interview-questions", "Interview Questions", "HR & Recruiting", "preparing interview questions", "Generate role-specific behavioural and technical questions mapped to the competencies being assessed, with what a strong answer looks like."),
    ("candidate-evaluation", "Candidate Evaluation", "HR & Recruiting", "evaluating a candidate after an interview", "Score against a consistent rubric, separate evidence from impression, and give a clear hire/no-hire with the deciding factors."),
    ("offer-letter", "Offer Letter", "HR & Recruiting", "drafting an offer letter", "Include role, start date, compensation, key terms, and a warm tone. Mark anything that should be reviewed by legal or the user."),
    ("onboarding-checklist", "Onboarding Checklist", "HR & Recruiting", "onboarding a new hire", "Produce a day-1 / week-1 / month-1 checklist covering accounts, equipment, intros, training, and first goals. Assign an owner to each item."),
    ("employee-handbook", "Employee Handbook", "HR & Recruiting", "drafting handbook policies", "Draft clear policy sections in plain language. Note where local law or legal review is required rather than inventing specifics."),
    ("performance-review", "Performance Review", "HR & Recruiting", "writing a performance review", "Structure around goals, strengths, growth areas, and specific examples. Keep feedback actionable and balanced; suggest next-period goals."),
    ("pto-policy", "Leave & PTO Policy", "HR & Recruiting", "drafting a leave or PTO policy", "Cover accrual, requests, approval, carryover, and edge cases in plain language. Flag where jurisdiction-specific rules apply."),

    # --- Customer Support ---
    ("support-response", "Support Response", "Customer Support", "drafting a customer support reply", "Acknowledge, answer the actual question, give clear steps, and set expectations. Match the customer's tone; be warm and concise."),
    ("faq-generation", "FAQ Generation", "Customer Support", "building an FAQ", "Cluster real questions, write plain-language answers, and order by frequency. Keep each answer self-contained."),
    ("complaint-resolution", "Complaint Resolution", "Customer Support", "handling a complaint or escalation", "Lead with empathy, own the problem, offer a concrete remedy, and confirm the fix. De-escalate before solving."),
    ("canned-responses", "Canned Responses", "Customer Support", "building reusable macros or templates", "Write reusable templates with clear placeholders for the common scenarios, each editable and on-brand."),
    ("refund-handling", "Refund Handling", "Customer Support", "processing a refund or return", "Confirm eligibility against policy, explain the outcome kindly, and lay out the steps and timing. Offer an alternative when a refund isn't possible."),
    ("csat-survey", "CSAT Survey Design", "Customer Support", "designing a satisfaction survey", "Keep it short, lead with the core satisfaction question, add one open follow-up, and avoid leading wording."),
    ("knowledge-base-article", "Knowledge Base Article", "Customer Support", "writing a help/KB article", "Task-focused title, prerequisites, numbered steps, screenshots-to-add markers, and a troubleshooting section. Write for a stressed reader."),
    ("ticket-triage", "Ticket Triage", "Customer Support", "triaging and prioritising tickets", "Classify by urgency and impact, assign a priority, and route or template a first response. Flag anything needing escalation."),

    # --- Operations ---
    ("sop-writing", "SOP Writing", "Operations", "writing a standard operating procedure", "Produce a titled SOP with purpose, scope, roles, numbered steps, and a quality check. Use the executable generator to save a file."),
    ("process-mapping", "Process Mapping", "Operations", "mapping or optimising a process", "Lay out the current steps, mark hand-offs and bottlenecks, and propose a streamlined version with the time/effort saved."),
    ("inventory-tracking", "Inventory Tracking", "Operations", "tracking or managing inventory", "Track quantity, reorder point, and lead time per item; flag low stock and suggest reorder quantities."),
    ("vendor-management", "Vendor Management", "Operations", "managing vendors or suppliers", "Track terms, reliability, and cost per vendor; compare options and recommend renegotiation or switching where it pays off."),
    ("meeting-agenda", "Meeting Agenda", "Operations", "preparing a meeting agenda", "Define the objective, timed topics with owners, pre-reads, and desired decisions. Use the executable generator to save a file."),
    ("meeting-minutes", "Meeting Minutes", "Operations", "capturing meeting minutes", "Record decisions, action items with owners and dates, and open questions — not a transcript. Lead with the action items."),
    ("project-kickoff", "Project Kickoff", "Operations", "kicking off a project", "Define goal, scope, roles, milestones, risks, and the first three actions. Capture what success looks like in one sentence."),
    ("risk-assessment", "Risk Assessment", "Operations", "assessing operational risk", "List risks with likelihood and impact, score them, and pair each high risk with a concrete mitigation and owner."),

    # --- Admin & Scheduling ---
    ("calendar-scheduling", "Calendar Scheduling", "Admin & Scheduling", "scheduling or optimising the calendar", "Propose time blocks that protect focus time, batch similar work, and respect existing commitments. Surface conflicts before booking."),
    ("email-triage", "Email Triage", "Admin & Scheduling", "triaging and prioritising the inbox", "Sort into act-now / delegate / defer / archive, draft quick replies for the easy ones, and surface anything time-sensitive first."),
    ("travel-planning", "Travel Planning", "Admin & Scheduling", "planning business travel", "Build an itinerary with flights, lodging, transit, and buffers around meetings. Note costs and anything needing booking confirmation."),
    ("document-formatting", "Document Formatting", "Admin & Scheduling", "formatting or cleaning up a document", "Apply consistent headings, spacing, and styling; fix structure and tighten wording without changing meaning."),
    ("data-entry", "Structured Data Entry", "Admin & Scheduling", "entering or structuring data", "Convert the source into clean, consistently formatted rows/fields, validate types, and flag anything ambiguous rather than guessing."),
    ("appointment-reminders", "Appointment Reminders", "Admin & Scheduling", "setting up appointment reminders", "Draft reminder messages with the key details and timing, and recommend a reminder cadence that reduces no-shows."),
    ("todo-prioritization", "To-do Prioritization", "Admin & Scheduling", "prioritising a to-do list", "Rank by impact and urgency, identify the one thing that matters most today, and suggest what to drop or defer."),

    # --- Legal & Compliance ---
    ("contract-review", "Contract Review", "Legal & Compliance", "reviewing a contract", "Summarise key terms, flag risky or unusual clauses, and list questions to raise. Always recommend a qualified lawyer for anything material."),
    ("nda-drafting", "NDA Drafting", "Legal & Compliance", "drafting a non-disclosure agreement", "Produce a clear mutual or one-way NDA covering definition, obligations, term, and exclusions. Mark it as a starting point for legal review."),
    ("terms-of-service", "Terms & Privacy Basics", "Legal & Compliance", "drafting basic terms or a privacy notice", "Draft plain-language sections for the common cases and clearly mark where jurisdiction-specific legal review is required."),
    ("gdpr-checklist", "Data Privacy Checklist", "Legal & Compliance", "checking data-privacy compliance", "Produce a practical GDPR/CCPA-style checklist covering lawful basis, consent, data inventory, retention, and subject requests."),
    ("policy-drafting", "Business Policy Drafting", "Legal & Compliance", "drafting an internal business policy", "Write a clear policy with purpose, scope, rules, and enforcement in plain language. Note where legal or HR review applies."),
    ("compliance-audit", "Compliance Self-Audit", "Legal & Compliance", "running a compliance self-audit", "Walk the relevant requirements as a checklist, mark pass/gap/unknown, and prioritise the gaps by risk."),

    # --- Data & Analytics ---
    ("data-cleaning", "Data Cleaning", "Data & Analytics", "cleaning or normalising a dataset", "Identify duplicates, missing values, and inconsistent formats; propose fixes and produce the cleaned structure. Never silently drop data."),
    ("spreadsheet-formulas", "Spreadsheet Formulas", "Data & Analytics", "building spreadsheet formulas", "Write the exact formula for Excel/Google Sheets, explain each part, and note edge cases. Prefer robust functions over fragile ones."),
    ("data-visualization", "Data Visualization", "Data & Analytics", "choosing or describing charts", "Recommend the chart type that fits the question, specify axes and series, and note what insight it should reveal."),
    ("kpi-dashboard", "KPI Dashboard", "Data & Analytics", "defining KPIs or a dashboard", "Pick a small set of KPIs tied to goals, define each metric precisely with its formula, and lay out a sensible dashboard order."),
    ("report-generation", "Report Generation", "Data & Analytics", "generating an analytical report", "Lead with the headline finding, support with the key numbers, then detail and recommendations. Make it skimmable."),
    ("ab-test-analysis", "A/B Test Analysis", "Data & Analytics", "analysing an A/B test", "State the metric, the lift, and whether the sample supports a conclusion. Be honest about significance; recommend ship/iterate/kill."),
    ("survey-analysis", "Survey Analysis", "Data & Analytics", "analysing survey results", "Summarise the quantitative results, theme the open responses, and surface the top 3 actionable insights with supporting numbers."),
    ("trend-analysis", "Trend Analysis", "Data & Analytics", "identifying trends in data", "Describe the direction, magnitude, and likely drivers; separate signal from noise and flag what to watch next."),

    # --- Product & Project ---
    ("user-story-writing", "User Story Writing", "Product & Project", "writing user stories", "Use 'As a / I want / so that' with clear, testable acceptance criteria. Keep stories small and independent."),
    ("product-roadmap", "Product Roadmap", "Product & Project", "building a product roadmap", "Organise by now/next/later tied to outcomes, not dates-as-promises. Make priority and rationale explicit."),
    ("feature-spec", "Feature Spec / PRD", "Product & Project", "writing a feature spec or PRD", "Cover problem, goals, user stories, scope, non-goals, and success metrics. Make the cut-line explicit."),
    ("sprint-planning", "Sprint Planning", "Product & Project", "planning a sprint", "Set a sprint goal, pull a realistic set of stories against capacity, flag dependencies, and define done."),
    ("bug-report", "Bug Report", "Product & Project", "structuring a bug report", "Capture steps to reproduce, expected vs actual, environment, and severity. Make it reproducible by someone else."),
    ("release-notes", "Release Notes", "Product & Project", "writing release notes", "Group by new / improved / fixed, write user-facing benefits not internal jargon, and lead with the highlight."),
    ("competitive-feature", "Feature Comparison", "Product & Project", "comparing features against competitors", "Build a feature matrix, mark parity/gap/advantage, and conclude with the differentiation worth investing in."),

    # --- IT & Dev ---
    ("code-review-helper", "Code Review Helper", "IT & Dev", "reviewing a code change", "Check correctness, edge cases, readability, and reuse. Lead with the highest-impact issues; suggest concrete fixes, not just problems."),
    ("api-documentation", "API Documentation", "IT & Dev", "documenting an API", "Document each endpoint: purpose, method/path, params, request/response examples, and errors. Make it copy-paste runnable."),
    ("tech-troubleshooting", "Tech Troubleshooting", "IT & Dev", "troubleshooting a technical issue", "Form a hypothesis, isolate variables, and give the most likely cause first with the exact step to confirm it. Avoid shotgun fixes."),
    ("deployment-checklist", "Deployment Checklist", "IT & Dev", "preparing a deployment", "Produce a pre/deploy/post checklist covering backups, migrations, rollback, monitoring, and smoke tests."),
    ("database-query", "Database Query", "IT & Dev", "writing a SQL or database query", "Write the exact query, explain the logic, and note performance/index considerations. Prefer safe, readable SQL."),
    ("automation-script", "Automation Script", "IT & Dev", "drafting an automation script", "Write a small, robust script with comments and error handling, and explain how to run it. Keep dependencies minimal."),

    # --- Communications ---
    ("meeting-summary", "Meeting Summary", "Communications", "summarising a meeting or call", "Capture decisions, action items with owners, and open questions in a tight summary. Lead with what changed and what's next."),
    ("executive-summary", "Executive Summary", "Communications", "writing an executive summary", "One paragraph: the situation, the recommendation, and the ask. Numbers first, jargon out, fits on half a page."),
    ("translation", "Business Translation", "Communications", "translating business text", "Translate accurately while preserving tone and intent, adapt idioms, and flag anything culturally sensitive or ambiguous."),
    ("announcement-writing", "Announcement Writing", "Communications", "writing an internal announcement", "Lead with the change and why it matters, what's expected, and where to ask questions. Keep the tone clear and reassuring."),
]
# fmt: on

# Slugs whose enabling injects an explicit note that an executable generator exists.
EXECUTABLE_SLUGS = {"invoice-creation", "sop-writing", "meeting-agenda", "email-newsletter", "proposal-writing", "meeting-minutes", "expense-tracking"}

# Default skills enabled on a fresh install (broadly useful for most users).
DEFAULT_ENABLED = {
    "meeting-summary", "email-triage", "todo-prioritization",
    "support-response", "blog-writing", "calendar-scheduling",
}


def init_skills_db():
    """Create the skills table and seed the catalog (idempotent)."""
    conn = _get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS skills (
            slug TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            when_to_use TEXT NOT NULL,
            instructions TEXT NOT NULL,
            executable INTEGER DEFAULT 0,
            enabled INTEGER DEFAULT 0,
            builtin INTEGER DEFAULT 1,
            source TEXT DEFAULT 'bundled',
            use_count INTEGER DEFAULT 0,
            created_at REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
        CREATE INDEX IF NOT EXISTS idx_skills_enabled ON skills(enabled);
    """)

    now = time.time()
    for slug, name, category, when, how in _CATALOG:
        executable = 1 if slug in EXECUTABLE_SLUGS else 0
        enabled = 1 if slug in DEFAULT_ENABLED else 0
        # Insert if new; refresh static fields without clobbering user enable state.
        existing = conn.execute("SELECT enabled FROM skills WHERE slug = ?", (slug,)).fetchone()
        if existing is None:
            conn.execute(
                "INSERT INTO skills (slug, name, category, description, when_to_use, "
                "instructions, executable, enabled, builtin, source, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'bundled', ?)",
                (slug, name, category, when.capitalize(), when, how, executable, enabled, now),
            )
        else:
            conn.execute(
                "UPDATE skills SET name=?, category=?, description=?, when_to_use=?, "
                "instructions=?, executable=? WHERE slug=?",
                (name, category, when.capitalize(), when, how, executable, slug),
            )
    conn.commit()
    conn.close()
    log.info(f"Skills catalog ready ({len(_CATALOG)} skills)")


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

def _row_to_dict(r: sqlite3.Row) -> dict:
    d = dict(r)
    d["executable"] = bool(d.get("executable"))
    d["enabled"] = bool(d.get("enabled"))
    d["builtin"] = bool(d.get("builtin"))
    return d


def list_skills(category: str | None = None, enabled_only: bool = False) -> list[dict]:
    conn = _get_db()
    q = "SELECT * FROM skills"
    clauses, params = [], []
    if category:
        clauses.append("category = ?")
        params.append(category)
    if enabled_only:
        clauses.append("enabled = 1")
    if clauses:
        q += " WHERE " + " AND ".join(clauses)
    q += " ORDER BY category, name"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_skill(slug: str) -> dict | None:
    conn = _get_db()
    row = conn.execute("SELECT * FROM skills WHERE slug = ?", (slug,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def set_skill_enabled(slug: str, enabled: bool) -> bool:
    conn = _get_db()
    cur = conn.execute("UPDATE skills SET enabled = ? WHERE slug = ?", (1 if enabled else 0, slug))
    conn.commit()
    changed = cur.rowcount > 0
    conn.close()
    if changed:
        log.info(f"Skill {'enabled' if enabled else 'disabled'}: {slug}")
    return changed


def bump_use_count(slug: str):
    conn = _get_db()
    conn.execute("UPDATE skills SET use_count = use_count + 1 WHERE slug = ?", (slug,))
    conn.commit()
    conn.close()


def categories_summary() -> list[dict]:
    conn = _get_db()
    rows = conn.execute(
        "SELECT category, COUNT(*) AS total, SUM(enabled) AS enabled "
        "FROM skills GROUP BY category ORDER BY category"
    ).fetchall()
    conn.close()
    return [{"category": r["category"], "total": r["total"], "enabled": r["enabled"] or 0} for r in rows]


def counts() -> dict:
    conn = _get_db()
    row = conn.execute("SELECT COUNT(*) AS total, SUM(enabled) AS enabled FROM skills").fetchone()
    conn.close()
    return {"total": row["total"] or 0, "enabled": row["enabled"] or 0}


def search_skills(query: str, limit: int = 20) -> list[dict]:
    """Keyword search across name, description, and instructions."""
    terms = [t for t in query.lower().split() if len(t) > 2]
    if not terms:
        return []
    conn = _get_db()
    like = "%" + "%".join(terms[:1]) + "%"
    rows = conn.execute(
        "SELECT * FROM skills WHERE LOWER(name || ' ' || description || ' ' || "
        "instructions || ' ' || category) LIKE ? ORDER BY enabled DESC, name LIMIT ?",
        (like, limit),
    ).fetchall()
    conn.close()
    results = [_row_to_dict(r) for r in rows]
    # Rank by how many query terms appear.
    def score(s: dict) -> int:
        blob = f"{s['name']} {s['description']} {s['instructions']} {s['category']}".lower()
        return sum(1 for t in terms if t in blob)
    results.sort(key=score, reverse=True)
    return results


def _tokens(text: str) -> list[str]:
    return [w for w in "".join(c if c.isalnum() else " " for c in text.lower()).split() if len(w) > 3]


def _term_matches(term: str, words: set[str]) -> bool:
    """Loose match tolerant of plurals/stems (hiring~hire, descriptions~description)."""
    if term in words:
        return True
    stem = term[:5]
    return any(w == term or w.startswith(stem) or term.startswith(w[:5]) for w in words)


def recommend_skills(goal_text: str, limit: int = 8) -> list[dict]:
    """Recommend skills for a free-text goal (used by onboarding)."""
    terms = _tokens(goal_text)
    if not terms:
        return []
    conn = _get_db()
    rows = conn.execute("SELECT * FROM skills").fetchall()
    conn.close()
    scored = []
    for r in rows:
        s = _row_to_dict(r)
        words = set(_tokens(f"{s['name']} {s['description']} {s['when_to_use']} {s['instructions']}"))
        cat_words = set(_tokens(s["category"]))
        score = 0
        for t in terms:
            if _term_matches(t, words):
                score += 1
            if _term_matches(t, cat_words):
                score += 2  # a category hit is a strong signal
        if score > 0:
            scored.append((score, s))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [s for _, s in scored[:limit]]


# ---------------------------------------------------------------------------
# Prompt building — what JARVIS sees about its skills
# ---------------------------------------------------------------------------

def enabled_skills_prompt(max_skills: int = 25) -> str:
    """Full instructions for enabled skills, injected into the system prompt."""
    enabled = list_skills(enabled_only=True)[:max_skills]
    if not enabled:
        return ""
    lines = ["ACTIVE SKILLS (use these capabilities when the situation fits):"]
    for s in enabled:
        tag = " [executable — use [ACTION:RUN_SKILL] " + s["slug"] + "]" if s["executable"] else ""
        lines.append(f"- {s['name']} — when {s['when_to_use']}: {s['instructions']}{tag}")
    return "\n".join(lines)


def catalog_index_prompt(limit: int = 60) -> str:
    """A lightweight menu of available (not-yet-enabled) skills JARVIS can suggest."""
    available = [s for s in list_skills() if not s["enabled"]][:limit]
    if not available:
        return ""
    by_cat: dict[str, list[str]] = {}
    for s in available:
        by_cat.setdefault(s["category"], []).append(s["name"])
    lines = ["AVAILABLE SKILLS (not yet enabled — suggest enabling when relevant):"]
    for cat, names in by_cat.items():
        lines.append(f"- {cat}: {', '.join(names)}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Executable handlers (hybrid model) — produce real artifacts
# ---------------------------------------------------------------------------

def _save_artifact(name: str, content: str) -> Path:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in name)
    path = ARTIFACTS_DIR / f"{int(time.time())}_{safe}"
    path.write_text(content, encoding="utf-8")
    return path



def list_artifacts(limit: int = 50) -> list[dict]:
    """Return recent artifacts produced by executable skills."""
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for path in sorted(ARTIFACTS_DIR.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True)[:limit]:
        if not path.is_file():
            continue
        stat = path.stat()
        items.append({
            "name": path.name,
            "path": str(path),
            "size": stat.st_size,
            "modified_at": stat.st_mtime,
            "download_url": f"/api/artifacts/{path.name}",
        })
    return items


def read_artifact(name: str, max_chars: int = 12000) -> dict:
    """Read an artifact by safe file name for previewing in the UI."""
    safe = Path(name).name
    path = ARTIFACTS_DIR / safe
    if not path.exists() or not path.is_file():
        return {"error": "Artifact not found"}
    content = path.read_text(encoding="utf-8", errors="replace")
    return {"name": safe, "path": str(path), "content": content[:max_chars], "truncated": len(content) > max_chars}

def _run_invoice(params: dict) -> dict:
    from datetime import datetime, timedelta
    seller = params.get("seller", "Your Company")
    client = params.get("client", "Client")
    items = params.get("items") or [{"description": params.get("description", "Services"),
                                     "qty": 1, "unit_price": float(params.get("amount", 0) or 0)}]
    tax_rate = float(params.get("tax_rate", 0) or 0)
    number = params.get("number", f"INV-{int(time.time()) % 100000}")
    due = params.get("due_date") or (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")

    subtotal = sum(float(i.get("qty", 1)) * float(i.get("unit_price", 0)) for i in items)
    tax = round(subtotal * tax_rate / 100, 2)
    total = round(subtotal + tax, 2)

    lines = [f"INVOICE {number}", f"Date: {datetime.now().strftime('%Y-%m-%d')}   Due: {due}", "",
             f"From: {seller}", f"To:   {client}", "", "Items:"]
    for i in items:
        qty = float(i.get("qty", 1)); up = float(i.get("unit_price", 0))
        lines.append(f"  - {i.get('description', 'Item')}: {qty:g} x {up:.2f} = {qty * up:.2f}")
    lines += ["", f"Subtotal: {subtotal:.2f}", f"Tax ({tax_rate:g}%): {tax:.2f}",
              f"TOTAL DUE: {total:.2f}", "", f"Payment terms: {params.get('terms', 'Net 14')}"]
    content = "\n".join(lines)
    path = _save_artifact(f"invoice_{number}.txt", content)
    return {"summary": f"Invoice {number} for {total:.2f}, due {due}", "path": str(path), "content": content}


def _run_sop(params: dict) -> dict:
    title = params.get("title", "Standard Operating Procedure")
    purpose = params.get("purpose", "")
    steps = params.get("steps") or []
    lines = [f"SOP: {title}", "", f"Purpose: {purpose}", "", "Steps:"]
    for n, step in enumerate(steps, 1):
        lines.append(f"  {n}. {step}")
    if not steps:
        lines.append("  (add steps)")
    lines += ["", "Quality check: confirm each step was completed and the output meets standard."]
    content = "\n".join(lines)
    path = _save_artifact(f"sop_{title}.txt", content)
    return {"summary": f"SOP '{title}' with {len(steps)} steps", "path": str(path), "content": content}


def _run_agenda(params: dict) -> dict:
    title = params.get("title", "Meeting Agenda")
    objective = params.get("objective", "")
    topics = params.get("topics") or []
    lines = [f"AGENDA: {title}", "", f"Objective: {objective}", "", "Topics:"]
    for t in topics:
        if isinstance(t, dict):
            lines.append(f"  - {t.get('topic', '')} ({t.get('minutes', '?')} min, owner: {t.get('owner', 'TBD')})")
        else:
            lines.append(f"  - {t}")
    if not topics:
        lines.append("  (add topics)")
    content = "\n".join(lines)
    path = _save_artifact(f"agenda_{title}.txt", content)
    return {"summary": f"Agenda '{title}' with {len(topics)} topics", "path": str(path), "content": content}



def _run_email_newsletter(params: dict) -> dict:
    audience = params.get("audience", "customers")
    topic = params.get("topic") or params.get("description", "Company update")
    cta = params.get("cta", "Reply with any questions")
    sections = params.get("sections") or ["Why it matters", "What is changing", "Next step"]
    lines = [
        f"Subject option A: {topic}: the short version",
        f"Subject option B: A useful update for {audience}",
        f"Preview text: {params.get('preview', 'A concise update with one clear next step.')}",
        "",
        f"Hi {params.get('greeting', 'there')},",
        "",
        f"Here is the practical update on {topic}.",
    ]
    for section in sections:
        lines += ["", f"## {section}", params.get(str(section).lower().replace(' ', '_'), "Add the key point here in two or three skimmable sentences.")]
    lines += ["", f"Primary CTA: {cta}", "", f"Sign-off: {params.get('signoff', 'Best,')}" ]
    content = "\n".join(lines)
    path = _save_artifact(f"newsletter_{topic}.md", content)
    return {"summary": f"Newsletter draft for {audience} about {topic}", "path": str(path), "content": content}


def _run_proposal(params: dict) -> dict:
    client = params.get("client", "Client")
    project = params.get("project") or params.get("description", "Project")
    deliverables = params.get("deliverables") or ["Discovery", "Implementation", "Handoff"]
    timeline = params.get("timeline", "TBD")
    price = params.get("price", "TBD")
    lines = [
        f"# Proposal: {project}",
        f"Prepared for: {client}",
        "",
        "## Client Problem",
        params.get("problem", "State the client's problem in their words."),
        "",
        "## Recommended Scope",
    ]
    for item in deliverables:
        lines.append(f"- {item}")
    lines += [
        "", "## Timeline", str(timeline),
        "", "## Investment", str(price),
        "", "## Assumptions", params.get("assumptions", "Scope, access, and approval timing to be confirmed before kickoff."),
        "", "## Next Step", params.get("next_step", "Approve this proposal and schedule kickoff."),
    ]
    content = "\n".join(lines)
    path = _save_artifact(f"proposal_{client}_{project}.md", content)
    return {"summary": f"Proposal draft for {client}: {project}", "path": str(path), "content": content}


def _run_meeting_minutes(params: dict) -> dict:
    title = params.get("title", "Meeting Minutes")
    attendees = params.get("attendees") or []
    decisions = params.get("decisions") or []
    actions = params.get("actions") or []
    open_questions = params.get("open_questions") or []
    lines = [f"# Minutes: {title}", "", f"Date: {params.get('date', time.strftime('%Y-%m-%d'))}", f"Attendees: {', '.join(attendees) if attendees else 'TBD'}", "", "## Summary", params.get("summary", "What changed and what happens next."), "", "## Decisions"]
    lines += [f"- {d}" for d in decisions] or ["- None captured"]
    lines += ["", "## Action Items"]
    if actions:
        for item in actions:
            if isinstance(item, dict):
                lines.append(f"- {item.get('owner', 'TBD')}: {item.get('task', '')} — due {item.get('due', 'TBD')}")
            else:
                lines.append(f"- {item}")
    else:
        lines.append("- None captured")
    lines += ["", "## Open Questions"]
    lines += [f"- {q}" for q in open_questions] or ["- None captured"]
    content = "\n".join(lines)
    path = _save_artifact(f"minutes_{title}.md", content)
    return {"summary": f"Meeting minutes for {title}", "path": str(path), "content": content}


def _run_expense_tracking(params: dict) -> dict:
    expenses = params.get("expenses") or [{"vendor": params.get("vendor", "Vendor"), "category": params.get("category", "General"), "amount": float(params.get("amount", 0) or 0), "date": params.get("date", time.strftime('%Y-%m-%d'))}]
    total = sum(float(e.get("amount", 0) or 0) for e in expenses)
    lines = ["date,vendor,category,amount,notes"]
    for e in expenses:
        notes = str(e.get("notes", "")).replace('"', '""')
        lines.append(f"{e.get('date', '')},{e.get('vendor', '')},{e.get('category', '')},{float(e.get('amount', 0) or 0):.2f},\"{notes}\"")
    content = "\n".join(lines) + f"\nTOTAL,,,{total:.2f},\n"
    path = _save_artifact(f"expenses_{time.strftime('%Y%m%d')}.csv", content)
    return {"summary": f"Expense log with {len(expenses)} item(s), total {total:.2f}", "path": str(path), "content": content}

EXECUTABLE_HANDLERS = {
    "invoice-creation": _run_invoice,
    "sop-writing": _run_sop,
    "meeting-agenda": _run_agenda,
    "email-newsletter": _run_email_newsletter,
    "proposal-writing": _run_proposal,
    "meeting-minutes": _run_meeting_minutes,
    "expense-tracking": _run_expense_tracking,
}


def run_skill(slug: str, params: dict | None = None) -> dict:
    """Execute an executable skill's handler. Returns {summary, path, content} or {error}."""
    handler = EXECUTABLE_HANDLERS.get(slug)
    if not handler:
        return {"error": f"Skill '{slug}' is not executable."}
    try:
        result = handler(params or {})
        bump_use_count(slug)
        log.info(f"Ran executable skill {slug}: {result.get('summary')}")
        return result
    except Exception as e:
        log.error(f"Skill {slug} failed: {e}")
        return {"error": str(e)}


# Initialize on import
init_skills_db()
