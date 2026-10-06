"""
Step 2 of 3. Fine-tunes the multilingual DistilBERT NER checkpoint on the 22 PII labels (token
classification, BIO; the first piece of each word carries the label). Reads train.jsonl and dev.jsonl,
writes the PyTorch model to ./model. About 90 minutes for 2 epochs on an Apple M1 Pro.

    python train.py 2
"""
import json, sys, numpy as np, torch
from seqeval.metrics import classification_report, f1_score, precision_score, recall_score
from transformers import AutoModelForTokenClassification, AutoTokenizer, DataCollatorForTokenClassification, Trainer, TrainingArguments

BASE = "Davlan/distilbert-base-multilingual-cased-ner-hrl"
EPOCHS = float(sys.argv[1]) if len(sys.argv) > 1 else 2
load = lambda name: [json.loads(l) for l in open(f"{name}.jsonl", encoding="utf-8")]
train, dev = load("train"), load("dev")
types = sorted({l[2:] for r in train for l in r["labels"] if l != "O"})
labels = ["O"] + [f"{p}-{t}" for t in types for p in ("B", "I")]
l2i = {l: i for i, l in enumerate(labels)}
tok = AutoTokenizer.from_pretrained(BASE)

def encode(rows):
    enc = tok([r["tokens"] for r in rows], is_split_into_words=True, truncation=True, max_length=256)
    items = []
    for i, r in enumerate(rows):
        prev, ids = None, []
        for w in enc.word_ids(i):
            ids.append(-100 if w is None or w == prev else l2i.get(r["labels"][w], 0))  # first piece carries the label
            prev = w
        items.append({"input_ids": enc["input_ids"][i], "attention_mask": enc["attention_mask"][i], "labels": ids})
    return items

class Rows(torch.utils.data.Dataset):
    def __init__(self, rows): self.items = encode(rows)
    def __len__(self): return len(self.items)
    def __getitem__(self, i): return self.items[i]

ds = {"train": Rows(train), "dev": Rows(dev)}
model = AutoModelForTokenClassification.from_pretrained(BASE, num_labels=len(labels), id2label=dict(enumerate(labels)), label2id=l2i, ignore_mismatched_sizes=True)

def metrics(p):
    pred = np.argmax(p.predictions, axis=2)
    y, yh = [], []
    for row, gold in zip(pred, p.label_ids):
        y.append([labels[g] for g in gold if g != -100]); yh.append([labels[x] for x, g in zip(row, gold) if g != -100])
    return {"precision": precision_score(y, yh), "recall": recall_score(y, yh), "f1": f1_score(y, yh)}

args = TrainingArguments("out", num_train_epochs=EPOCHS, per_device_train_batch_size=32, per_device_eval_batch_size=64, learning_rate=5e-5, weight_decay=0.01,
                         warmup_ratio=0.06, logging_steps=100, eval_strategy="epoch", save_strategy="no", report_to=[], seed=7, dataloader_pin_memory=False)
trainer = Trainer(model=model, args=args, train_dataset=ds["train"], eval_dataset=ds["dev"], data_collator=DataCollatorForTokenClassification(tok), compute_metrics=metrics)
trainer.train()
print("DEV", trainer.evaluate())
trainer.save_model("model"); tok.save_pretrained("model")
