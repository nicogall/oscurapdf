"""
Step 1 of 3. Downloads a sample of the public synthetic dataset rizzoaiacademy/anonimizzazione-testi-italiano
(MIT) and writes train.jsonl, dev.jsonl and heldout.jsonl (tokens + BIO labels) in the current directory.
Run outside the repository: the data must never be committed.

    python prepare.py
"""
import collections, json, random, re, subprocess, urllib.request
BASE = "https://huggingface.co/datasets/rizzoaiacademy/anonimizzazione-testi-italiano/resolve/main/"
LISTING = "https://huggingface.co/api/datasets/rizzoaiacademy/anonimizzazione-testi-italiano/tree/main/contributions?limit=1000"
files = json.load(urllib.request.urlopen(LISTING))
def who(p):
    n = p.split("/")[-1]
    m = re.match(r"([A-Za-z][A-Za-z0-9]*?)(?:-edgecases|-web\d+|-1M)?-\d{8}", n)
    if m: return m.group(1)
    m = re.match(r"[\d_-]+-?([a-z-]+?)-Contributo", n)
    return "std:" + m.group(1) if m else "other"
groups = collections.defaultdict(list)
for f in files: groups[who(f["path"])].append(f["path"])
# Held out by contributor or domain: never used for training.
HELD_OUT = {"plucius", "8Attilio1", "std:appalti-pubblici", "std:bancario-finanziario", "other"}
PER_GROUP, BYTES, ROWS = 3, 4_500_000, 2500
random.seed(7)
TAG_MAP = {"GIVENNAME": "FULLNAME", "SURNAME": "FULLNAME", "GIUDICE": "FULLNAME", "AVVOCATO": "FULLNAME", "CONVENUTO": "FULLNAME", "ATTORE": "FULLNAME",
           "TESTIMONE": "FULLNAME", "SEX": "GENDER", "TAXNUM": "PIVA", "PEC": "EMAIL", "RG": "DOCID", "IDCARDNUM": "ID_DOC", "PASSPORTNUM": "ID_DOC",
           "DRIVERLICENSENUM": "ID_DOC", "SOCIALNUM": "ID_DOC", "CONTO": "IBAN", "CIG": "DOCID", "CUP": "DOCID", "POLIZZA": "DOCID", "MATRICOLA": "DOCID"}
DROP = {"TITLE", "TRIBUNAL"}
def normalize(labels):
    out, prev = [], None
    for l in labels:
        typ = TAG_MAP.get(l[2:], l[2:]) if l != "O" else None
        if typ is None or typ in DROP: out.append("O"); prev = None; continue
        out.append(("I-" if typ == prev and l.startswith("I-") else "B-") + typ); prev = typ
    return out
def fetch(path):
    raw = subprocess.run(["curl", "-sL", "-r", f"0-{BYTES}", BASE + path], capture_output=True).stdout.decode("utf-8", "ignore")
    rows = []
    for line in raw.split("\n")[:-1]:
        try: r = json.loads(line)
        except Exception: continue
        t, l = r.get("tokens"), r.get("bio_labels")
        if t and l and len(t) == len(l) and len(t) <= 400: rows.append({"tokens": t, "labels": normalize(l), "text": r.get("source_text", ""), "entities": r.get("entities", [])})
    return rows[:ROWS]
train, held = [], []
for g, paths in sorted(groups.items()):
    if g in {"std:appalti-pubblici", "std:bancario-finanziario", "other"}: continue  # kept aside for measuring the rules
    chosen = random.sample(paths, min(PER_GROUP, len(paths)))
    for p in chosen:
        rows = fetch(p)
        (held if g in HELD_OUT else train).extend(rows)
        print(f"{g:24} {len(rows):5} rows  {p.split('/')[-1][:60]}", flush=True)
random.shuffle(train)
dev = train[:2000]; train = train[2000:]
for name, rows in [("train", train), ("dev", dev), ("heldout", held)]:
    with open(f"{name}.jsonl", "w", encoding="utf-8") as f:
        for r in rows: f.write(json.dumps(r, ensure_ascii=False) + "\n")
    c = collections.Counter(l[2:] for r in rows for l in r["labels"] if l.startswith("B-"))
    print(name, len(rows), dict(c.most_common()))
