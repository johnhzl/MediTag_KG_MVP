from pathlib import Path
import json

def load_labeling_records(project_id: str) -> list[dict]:
    path = get_labeling_dataset_path(project_id)  # -> backend/data/projects/p1/labeling/labeling_inputs.jsonl
    records = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            records.append(json.loads(line))
    return records

def list_samples(project_id: str, limit=20, offset=0):
    records = load_labeling_records(project_id)
    page = records[offset: offset + limit]
    return {
        "items": [
            {
                "sample_id": r["sample_id"],
                "title": r["title"],
                "text_preview": r["raw_text"][:80] + "...",
                "has_cot": bool(r.get("cot_text")),
                "suggested_label": r["labels"][0] if r["labels"] else "",
                "labels": r["labels"]
            }
            for r in page
        ],
        "total": len(records),
    }

def get_sample_detail(project_id: str, sample_id: str):
    records = load_labeling_records(project_id)
    for r in records:
        if r["sample_id"] == sample_id:
            return {
                "sample_id": r["sample_id"],
                "project_id": r["project_id"],
                "title": r["title"],
                "raw_text": r["raw_text"],
                "labels": r["labels"],
                "current_label": r["labels"][0] if r["labels"] else "",
                "cot_text": r.get("cot_text", ""),
                "has_manual_cot": False,
            }
    raise NotFound(...)
