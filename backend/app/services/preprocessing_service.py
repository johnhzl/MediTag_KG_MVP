# 伪代码，放在 preprocessing_service 或单独脚本里
from pathlib import Path
import json, re

raw_path = DATA_ROOT / "projects" / "p1" / "raw" / "med_think_responses.jsonl"
out_path = DATA_ROOT / "projects" / "p1" / "labeling" / "labeling_inputs.jsonl"

def strip_code_fence(s: str) -> str:
    s = s.strip()
    s = re.sub(r"^```json", "", s)
    s = re.sub(r"```$", "", s)
    return s.strip()

with raw_path.open("r", encoding="utf-8") as fin, \
     out_path.open("w", encoding="utf-8") as fout:
    for line in fin:
        obj = json.loads(line)
        sample_id = obj["custom_id"]
        user_content = obj["request"]["messages"][1]["content"]

        # 提取诊断结论（你原 prompt 里有 “诊断结论：xxxxx” 这一段）
        # 简单做法：按行 split，找到包含“诊断结论：”的那一行
        diagnosis_line = next(
            (ln for ln in user_content.splitlines() if "诊断结论：" in ln),
            ""
        )
        diagnosis_text = diagnosis_line.replace("诊断结论：", "").strip()

        # 解析 JSON 字符串里的 COT 结果
        resp_obj = json.loads(strip_code_fence(obj["response"]))
        labels = resp_obj["all_result"]

        # 这里先只保留一个整体 COT，可以按需要拆成每个 label 一条
        # 比如 concat 所有 label 对应的 med_think
        cot_parts = []
        for label in labels:
            cot_parts.append(resp_obj.get(label, ""))
        full_cot = "\n\n".join(cot_parts)

        out_record = {
            "sample_id": sample_id,
            "project_id": "p1",
            "title": diagnosis_text,
            "raw_text": user_content,
            "labels": labels,
            "cot_text": full_cot
        }
        fout.write(json.dumps(out_record, ensure_ascii=False) + "\n")
