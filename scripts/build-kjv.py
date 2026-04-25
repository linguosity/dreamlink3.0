#!/usr/bin/env python3
# Build data/kjv.json from aruljohn/Bible-kjv (MIT, KJV public domain).
# Run once: `python3 scripts/build-kjv.py`. Output is committed to the repo.

import json
import sys
import urllib.request
from pathlib import Path

BASE = "https://raw.githubusercontent.com/aruljohn/Bible-kjv/master"
OUT = Path(__file__).parent.parent / "data" / "kjv.json"


def fetch(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    books = fetch(f"{BASE}/Books.json")
    if not isinstance(books, list) or len(books) != 66:
        print(f"Unexpected Books.json: {len(books) if isinstance(books, list) else type(books)}", file=sys.stderr)
        return 1

    verses: list[dict] = []
    for i, book in enumerate(books, 1):
        slug = book.replace(" ", "")
        data = fetch(f"{BASE}/{slug}.json")
        for chap in data.get("chapters", []):
            chapter = int(chap["chapter"])
            for v in chap.get("verses", []):
                verses.append({
                    "book": book,
                    "chapter": chapter,
                    "verse": int(v["verse"]),
                    "text": v["text"],
                })
        print(f"  [{i:>2}/66] {book}: {sum(len(c.get('verses', [])) for c in data.get('chapters', []))} verses", file=sys.stderr)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(verses, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = OUT.stat().st_size / (1024 * 1024)
    print(f"Wrote {len(verses)} verses to {OUT} ({size_mb:.2f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
