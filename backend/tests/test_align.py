from app.align import ONSET_LEAD_S, is_aligned, snap_to_pauses


def line(start: float, end: float, text: str = "x") -> dict:
    return {"start": start, "end": end, "text": text, "p": 0}


def test_snaps_each_start_to_the_nearest_pause_end():
    lines = [line(0, 3), line(3, 6), line(6, 9)]
    snapped = snap_to_pauses(lines, [3.6, 5.4], duration=9)
    assert [s["start"] for s in snapped] == [
        0,
        round(3.6 - ONSET_LEAD_S, 2),
        round(5.4 - ONSET_LEAD_S, 2),
    ]
    assert [s["end"] for s in snapped] == [snapped[1]["start"], snapped[2]["start"], 9]


def test_keeps_estimate_when_no_pause_is_close():
    snapped = snap_to_pauses([line(0, 3), line(3, 6)], [20.0], duration=6)
    assert snapped[1]["start"] == 3


def test_never_reorders_lines_onto_the_same_pause():
    snapped = snap_to_pauses([line(0, 2), line(2, 2.5), line(2.5, 5)], [2.4], duration=5)
    starts = [s["start"] for s in snapped]
    assert starts == sorted(starts) and len(set(starts)) == 3


def test_does_not_mutate_input_and_marks_aligned():
    lines = [line(0, 3), line(3, 6)]
    snapped = snap_to_pauses(lines, [3.5], duration=6)
    assert lines[1]["start"] == 3 and "a" not in lines[1]
    assert is_aligned(snapped) and not is_aligned(lines) and not is_aligned(None)
