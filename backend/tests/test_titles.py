from app.schemas import Source
from app.titles import clean_title, source_title, title_from_text, title_from_url


def test_markdown_link_titles_become_their_text():
    assert clean_title("[Bharat Semi raises $24M seed round](https://x.com/a)") == (
        "Bharat Semi raises $24M seed round"
    )


def test_navigation_boilerplate_is_rejected():
    assert clean_title("[Skip to content](#content)") is None
    assert clean_title("[Subscribe](/newsletter/subscribe)") is None
    assert clean_title("Menu") is None


def test_falls_back_to_a_readable_url_slug():
    url = "https://inc42.com/buzz/bharat-semi-raises-24-mn-to-build-smart-sensors/"
    assert source_title("[Skip to content](#content)", url) == (
        "Bharat semi raises 24 mn to build smart sensors"
    )
    assert title_from_url("https://www.example.com/") == "example.com"


def test_first_real_line_of_page_text_is_used():
    text = "[Skip to content](#content)\n# Oister Global launches deep-tech fund\nBody..."
    assert title_from_text(text, "https://bs.com/x") == "Oister Global launches deep-tech fund"


def test_stored_sources_are_cleaned_when_served():
    src = Source.model_validate(
        {
            "id": "S1",
            "title": "[Subscribe](/newsletter/subscribe)",
            "url": "https://entrackr.com/2026/11/weekly-funding-report-indian-startups/",
        }
    )
    assert src.title == "Weekly funding report indian startups"
