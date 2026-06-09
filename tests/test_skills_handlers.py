"""Unit tests for the executable skill handlers added alongside the
Personal Assistant catalog — password, unit conversion, markdown→HTML,
reading list, and daily brief. Artifacts are redirected to a temp dir so
data/ stays clean.
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import skills

_TMP = Path(tempfile.mkdtemp(prefix="jarvis_test_artifacts_"))
skills.ARTIFACTS_DIR = _TMP


def test_catalog_registers_new_skills():
    slugs = {s[0] for s in skills._CATALOG}
    for slug in ("daily-brief", "reading-list", "password-generator",
                 "unit-converter", "markdown-to-html", "focus-sprint", "decision-helper"):
        assert slug in slugs, slug
    for slug in skills.EXECUTABLE_SLUGS:
        # every advertised executable slug must exist in the catalog and have a handler
        assert slug in slugs, slug
        assert slug in skills.EXECUTABLE_HANDLERS, slug


def test_password_generator_no_artifact():
    result = skills.run_skill("password-generator", {"length": 24})
    assert "error" not in result
    assert len(result["content"]) == 24
    assert "path" not in result  # secrets must not be written to disk
    # two runs differ
    other = skills.run_skill("password-generator", {"length": 24})
    assert other["content"] != result["content"]


def test_password_length_clamped():
    result = skills.run_skill("password-generator", {"length": 2})
    assert len(result["content"]) == 8


def test_unit_converter_length():
    result = skills.run_skill("unit-converter", {"value": 5, "from": "miles", "to": "km"})
    assert "error" not in result
    assert "8.04672" in result["content"]


def test_unit_converter_temperature():
    result = skills.run_skill("unit-converter", {"value": 100, "from": "celsius", "to": "fahrenheit"})
    assert "212" in result["content"]


def test_unit_converter_rejects_cross_kind():
    result = skills.run_skill("unit-converter", {"value": 1, "from": "kg", "to": "km"})
    assert "error" in result


def test_unit_converter_rejects_garbage():
    result = skills.run_skill("unit-converter", {"value": "lots", "from": "mi", "to": "km"})
    assert "error" in result


def test_markdown_to_html_artifact():
    md = "# Title\n\nSome **bold** text with [a link](https://x.io).\n\n- one\n- two\n\n```\ncode <here>\n```"
    result = skills.run_skill("markdown-to-html", {"markdown": md, "title": "Test Page"})
    assert "error" not in result
    html = result["content"]
    assert "<h1>Title</h1>" in html
    assert "<strong>bold</strong>" in html
    assert '<a href="https://x.io">a link</a>' in html
    assert "<li>one</li>" in html
    assert "code &lt;here&gt;" in html  # code blocks stay escaped
    assert Path(result["path"]).exists()
    assert result["path"].endswith(".html")


def test_reading_list_appends():
    first = skills.run_skill("reading-list", {"title": "Deep Work", "url": "https://example.com", "note": "focus"})
    assert "error" not in first
    second = skills.run_skill("reading-list", {"title": "Atomic Habits"})
    content = second["content"]
    assert "Deep Work" in content and "Atomic Habits" in content
    assert Path(second["path"]).name == "reading_list.md"


def test_daily_brief_artifact():
    result = skills.run_skill("daily-brief", {"focus": "ship the release"})
    assert "error" not in result
    assert "Daily Brief" in result["content"]
    assert "ship the release" in result["content"]
    assert Path(result["path"]).exists()


def test_run_skill_unknown_slug():
    result = skills.run_skill("not-a-skill", {})
    assert "error" in result


# --- manual runner (no pytest required) -------------------------------------

if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"FAIL {fn.__name__}: {e}")
    print(f"\n{len(fns) - failed}/{len(fns)} passed")
    sys.exit(1 if failed else 0)
