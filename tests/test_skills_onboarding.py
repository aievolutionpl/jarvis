"""Tests for the skills catalog, onboarding profile, and MCP registry.

These use the shared SQLite DB (created on import). They assert on structure and
behavior that should hold regardless of any local enable/connect state, so they
are safe to run repeatedly.
"""

import skills
import onboarding
import mcp_registry


# ---------------------------------------------------------------------------
# Skills
# ---------------------------------------------------------------------------

def test_catalog_has_100_skills():
    all_skills = skills.list_skills()
    assert len(all_skills) == 100
    # Every skill has the fields the prompt builder and UI depend on.
    for s in all_skills:
        assert s["slug"] and s["name"] and s["category"]
        assert s["when_to_use"] and s["instructions"]
        assert isinstance(s["enabled"], bool)
        assert isinstance(s["executable"], bool)


def test_slugs_are_unique():
    slugs = [s["slug"] for s in skills.list_skills()]
    assert len(slugs) == len(set(slugs))


def test_enable_disable_roundtrip():
    slug = "competitor-analysis"
    assert skills.set_skill_enabled(slug, True)
    assert skills.get_skill(slug)["enabled"] is True
    assert skills.set_skill_enabled(slug, False)
    assert skills.get_skill(slug)["enabled"] is False


def test_toggle_unknown_skill_returns_false():
    assert skills.set_skill_enabled("does-not-exist", True) is False


def test_search_finds_relevant_skill():
    results = skills.search_skills("invoice")
    assert any(r["slug"] == "invoice-creation" for r in results)


def test_recommend_skills_for_goal():
    recs = skills.recommend_skills("I need help hiring and writing job descriptions")
    assert any(r["category"] == "HR & Recruiting" for r in recs)


def test_executable_skill_produces_artifact(tmp_path, monkeypatch):
    monkeypatch.setattr(skills, "ARTIFACTS_DIR", tmp_path)
    result = skills.run_skill("invoice-creation", {"client": "Acme", "amount": 1000, "tax_rate": 20})
    assert "error" not in result
    assert "1200" in result["content"]  # 1000 + 20% tax
    assert result["path"]


def test_non_executable_skill_run_errors():
    result = skills.run_skill("blog-writing", {})
    assert "error" in result


def test_enabled_prompt_lists_active_skills():
    skills.set_skill_enabled("email-triage", True)
    prompt = skills.enabled_skills_prompt()
    assert "Email Triage" in prompt


# ---------------------------------------------------------------------------
# Onboarding
# ---------------------------------------------------------------------------

def test_profile_set_and_get():
    onboarding.set_profile("role", "Founder")
    assert onboarding.get_profile()["role"] == "Founder"


def test_profile_prompt_includes_known_fields():
    onboarding.set_profile_many({"name": "Chris", "business": "Agency"})
    prompt = onboarding.profile_prompt()
    assert "Chris" in prompt and "Agency" in prompt


def test_onboarding_complete_stops_active():
    onboarding.complete()
    assert onboarding.is_active() is False
    onboarding.reset()
    assert onboarding.is_active() is True


def test_missing_fields_excludes_known():
    onboarding.reset()
    onboarding.set_profile("name", "Chris")
    assert "name" not in onboarding.missing_fields()


# ---------------------------------------------------------------------------
# MCP registry
# ---------------------------------------------------------------------------

def test_mcp_catalog_listed_with_status():
    servers = mcp_registry.list_servers()
    assert len(servers) >= 10
    for s in servers:
        assert s["id"] and s["name"]
        assert isinstance(s["connected"], bool)
        assert isinstance(s["capabilities"], list)


def test_mcp_connect_disconnect_roundtrip():
    mcp_registry.connect("notion", {})
    assert any(s["id"] == "notion" and s["connected"] for s in mcp_registry.list_servers())
    mcp_registry.disconnect("notion")
    assert not any(s["id"] == "notion" and s["connected"] for s in mcp_registry.list_servers())


def test_mcp_connect_unknown_errors():
    assert "error" in mcp_registry.connect("not-a-real-server")


def test_mcp_recommend_matches_named_tools():
    recs = mcp_registry.recommend_servers("we use notion and slack daily")
    ids = [s["id"] for s in recs]
    assert "notion" in ids and "slack" in ids
