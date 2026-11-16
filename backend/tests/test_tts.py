import io
import wave

from app.tts import MAX_CHUNK_CHARS, SAMPLE_RATE, chunk_script, halve, read_pcm, silence


def make_wav(frames: bytes, rate: int = SAMPLE_RATE) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(frames)
    return buf.getvalue()


def test_chunks_respect_limit_and_keep_all_text():
    script = ("This is a sentence about funding. " * 40) + "\n\n" + ("Another one here. " * 30)
    chunks = chunk_script(script)
    assert all(len(c.text) <= MAX_CHUNK_CHARS for c in chunks)
    assert " ".join(c.text for c in chunks).split() == script.split()


def test_paragraph_end_is_marked():
    chunks = chunk_script("First para. Short.\n\nSecond para.")
    assert [c.ends_paragraph for c in chunks] == [True, True]


def test_overlong_sentence_is_split():
    long_sentence = "word " * 300
    assert all(len(c.text) <= MAX_CHUNK_CHARS for c in chunk_script(long_sentence))


def test_halve_keeps_text():
    text = "One sentence here. Two sentence here. Three sentence here. Four."
    a, b = halve(text)
    assert a and b and f"{a} {b}".split() == text.split()


def test_read_pcm_roundtrip():
    frames = silence(0.1)
    assert read_pcm(make_wav(frames)) == frames


def test_hindi_danda_splits_sentences():
    hindi = "आज बाज़ार ऊपर गया। निवेशक खुश हैं। " * 30
    chunks = chunk_script(hindi)
    assert len(chunks) > 1
    assert all(len(c.text) <= MAX_CHUNK_CHARS for c in chunks)
    assert all(c.text.endswith("।") for c in chunks)
