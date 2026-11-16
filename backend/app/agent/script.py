"""Script writer: turns grounded findings into a ~5 minute spoken script."""

import json
import re

from openai import AsyncOpenAI

from app.agent.llm import call_forced_tool, tool
from app.agent.research import ResearchResult

SUBMIT_SCRIPT = tool(
    "submit_script",
    "Submit the finished episode.",
    {
        "title": {"type": "string", "description": "Short episode title, max 80 characters"},
        "script": {
            "type": "string",
            "description": "The full spoken script. Paragraphs separated by blank lines.",
        },
    },
    ["title", "script"],
)

STYLE = """Write for the ear, not the eye:
- Plain sentences, mostly under 25 words. No markdown, bullet points, emojis, headings or URLs.
- Write numbers, money and dates the way a host would say them: "two point five million
  dollars", "the twelfth of November", "twenty twenty six". No symbols like $, %, or +.
- Attribute facts naturally ("according to TechCrunch"). Never invent facts, figures or
  quotes; use only the findings provided. If there is little news, say so briefly.
- Never talk about the research process (search snippets, truncated articles, sources you
  could not read). The coverage note is for you, not the listener: leave out or soften
  claims it marks as weak instead of narrating the caveat.
- Structure: a one-line cold open, a short welcome naming the topic and date, the stories
  grouped by theme with smooth transitions, then a two-sentence wrap-up.
- No sign-off with a host name. Do not mention that you are an AI."""


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text))


def build_brief(topic: str, local_date: str, research: ResearchResult) -> str:
    sources = {s.id: s for s in research.sources}
    lines = []
    for i, f in enumerate(research.findings, 1):
        names = ", ".join(sorted({_publisher(sources[sid].url) for sid in f["source_ids"]}))
        lines.append(f"{i}. {f['point']} (sources: {names})")
    note = next((e.get("note") for e in research.log if e.get("tool") == "finish_research"), "")
    return (
        f"Topic: {topic}\nDate: {local_date}\n\nFindings:\n"
        + "\n".join(lines)
        + f"\n\nResearch coverage note: {note or 'none'}"
    )


def _publisher(url: str) -> str:
    host = re.sub(r"^https?://(www\.)?", "", url).split("/")[0]
    return host


async def write_script(
    llm: AsyncOpenAI, topic: str, local_date: str, research: ResearchResult, target_words: int
) -> tuple[str, str]:
    brief = build_brief(topic, local_date, research)
    low, high = int(target_words * 0.85), int(target_words * 1.2)
    messages = [
        {
            "role": "system",
            "content": f"You write scripts for a daily news podcast.\n{STYLE}\n"
            f"Length: {target_words} words (between {low} and {high}). That is about five "
            "minutes read aloud.",
        },
        {"role": "user", "content": brief},
    ]
    out = await call_forced_tool(llm, messages, SUBMIT_SCRIPT)
    title, script = out["title"].strip()[:120], out["script"].strip()

    n = word_count(script)
    if not low <= n <= high and research.findings:
        # One revision pass to land the five-minute target.
        direction = "Expand with more context on the findings" if n < low else "Tighten"
        messages += [
            {"role": "assistant", "content": json.dumps({"title": title, "script": script})},
            {
                "role": "user",
                "content": f"That script is {n} words. {direction} to about {target_words} "
                "words. Same rules, no new facts.",
            },
        ]
        out = await call_forced_tool(llm, messages, SUBMIT_SCRIPT)
        title, script = out["title"].strip()[:120], out["script"].strip()
    return title, clean_for_speech(script)


def clean_for_speech(text: str) -> str:
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"[*_#`>]+", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()
