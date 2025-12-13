from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json
from typing import List, Dict, Any, Optional
import re
from collections import Counter, defaultdict
from functools import lru_cache


app = FastAPI()

# 允许前端的地址访问
origins = [
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据根目录：backend/data
DATA_ROOT = Path(__file__).resolve().parent / "data"


# --------- 工具函数：加载 jsonl ---------

def get_labeling_path(project_id: str) -> Path:
    return DATA_ROOT / "projects" / project_id / "labeling" / "labeling_inputs.jsonl"

# ====================== MedThink 原始数据解析 ======================

def get_medthink_path(project_id: str) -> Path:
    """
    返回 med_think_responses.jsonl 的路径：
    backend/data/projects/<project_id>/raw/med_think_responses.jsonl
    """
    return DATA_ROOT / "projects" / project_id / "raw" / "med_think_responses.jsonl"


def _extract_json_from_markdown(text: str) -> str:
    """
    把 ```json ... ``` 代码块里的纯 JSON 抠出来。
    """
    if not text:
        return ""
    s = text.strip()
    if s.startswith("```"):
        # 去掉 ```json / ``` 前缀
        if s.lower().startswith("```json"):
            s = s[7:]
        else:
            s = s[3:]
        s = s.lstrip()
        # 去掉末尾 ```
        if s.endswith("```"):
            s = s[:-3]
    return s.strip()


_med_think_pattern = re.compile(r"<med_think>(.*?)</med_think>", re.DOTALL)


def _extract_med_think_block(text: str) -> str:
    """
    从 <med_think>...</med_think> 中抽出内部内容；
    若找不到标签，则直接返回原文。
    """
    if not text:
        return ""
    m = _med_think_pattern.search(text)
    if m:
        return m.group(1).strip()
    return text.strip()


def _parse_medthink_record(raw: Dict[str, Any], idx: int, project_id: str) -> Dict[str, Any]:
    """
    将 med_think_responses.jsonl 中的一行原始记录解析为统一结构。
    """
    sample_id = str(raw.get("custom_id") or idx)

    # 1) 拿到 user 消息里的“快诊信息 / 病历文本”
    request = raw.get("request", {})
    messages = request.get("messages", [])
    user_content = ""
    for m in messages:
        if m.get("role") == "user":
            user_content = m.get("content", "")
            break

    emr_text = user_content or ""

    # 简单从 user 文本里抽 patient_id、日期（没抽到就留空）
    patient_id = None
    visit_date = None

    m_id = re.search(r"病患id：([^｜\|]+)", user_content)
    if m_id:
        patient_id = m_id.group(1).strip()

    m_date = re.search(r"日期：(\d{4}-\d{2}-\d{2})", user_content)
    if m_date:
        visit_date = m_date.group(1)

    # 2) 解析 response 里的 JSON 思维链
    resp_str = raw.get("response", "")
    json_str = _extract_json_from_markdown(resp_str)

    try:
        payload = json.loads(json_str)
    except Exception as e:
        print(f"[WARN] failed to parse med_think JSON for sample {sample_id}: {e}")
        payload = {}

    diagnosis_list = payload.get("all_result") or []
    model_thinks = []
    total_tokens = 0

    for label in diagnosis_list:
        raw_think = payload.get(label, "")
        med_think = _extract_med_think_block(raw_think)
        tokens = len(med_think.split())
        total_tokens += tokens
        model_thinks.append(
            {
                "label": label,
                "med_think": med_think,
                "tokens": tokens,
            }
        )

    has_cot_for_all = bool(diagnosis_list) and all(
        bool(mt["med_think"]) for mt in model_thinks
    )

    return {
        "sample_id": sample_id,
        "project_id": project_id,
        "patient_id": patient_id,
        "visit_date": visit_date,
        "diagnosis_list": diagnosis_list,
        "diagnosis_count": len(diagnosis_list),
        "emr_text": emr_text,
        "model_thinks": model_thinks,
        "total_cot_tokens": total_tokens,
        "has_cot_for_all": has_cot_for_all,
    }


def load_medthink_samples(project_id: str) -> List[Dict[str, Any]]:
    """
    读取 med_think_responses.jsonl，解析为统一结构列表。

    注意：目前是每次请求都整文件读取，数据量大时可以再做缓存 / 索引。
    """
    path = get_medthink_path(project_id)
    if not path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"med_think_responses.jsonl not found: {path}",
        )

    samples: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for idx, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                raw = json.loads(line)
                one = _parse_medthink_record(raw, idx, project_id)
                samples.append(one)
            except Exception as e:
                # 有问题的记录先跳过，后面可以做日志汇总
                print(f"[WARN] skip bad med_think line #{idx}: {e}")
                continue
    return samples

def load_labeling_records(project_id: str) -> List[Dict[str, Any]]:
    path = get_labeling_path(project_id)
    if not path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"labeling_inputs.jsonl not found: {path}",
        )

    records: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            records.append(json.loads(line))
    return records
def get_qc_issues_path(project_id: str) -> Path:
  return DATA_ROOT / "projects" / project_id / "qc" / "qc_issues.jsonl"


def load_qc_issues(project_id: str) -> List[Dict[str, Any]]:
  path = get_qc_issues_path(project_id)
  if not path.exists():
      # 没有文件就返回空列表，不算错误
      return []
  issues: List[Dict[str, Any]] = []
  with path.open("r", encoding="utf-8") as f:
      for line in f:
          line = line.strip()
          if not line:
              continue
          issues.append(json.loads(line))
  # 只保留当前项目的（保险起见）
  issues = [i for i in issues if i.get("projectId") == project_id]
  return issues

# --------- 1) 样本列表接口 ---------

@app.get("/api/v1/projects/{project_id}/labeling/samples")
def list_labeling_samples(project_id: str, limit: int = 30, offset: int = 0):
    records = load_labeling_records(project_id)
    total = len(records)
    page = records[offset: offset + limit]

    items = []
    for r in page:
        items.append(
            {
                "sample_id": r["sample_id"],
                "title": r.get("title", f"样本 {r['sample_id']}"),
                "text_preview": r.get("raw_text", "")[:80] + "...",
                "has_cot": bool(r.get("cot_text")),
                "suggested_label": r.get("labels", [None])[0],
                "labels": r.get("labels", []),
            }
        )

    return {"items": items, "total": total}


# --------- 2) 单条样本详情 ---------

@app.get("/api/v1/labeling/samples/{sample_id}")
def get_labeling_sample(sample_id: str, project_id: str = "p1"):
    records = load_labeling_records(project_id)
    for r in records:
        if str(r["sample_id"]) == str(sample_id):
            labels = r.get("labels", [])
            return {
                "sample_id": r["sample_id"],
                "project_id": r.get("project_id", project_id),
                "title": r.get("title", f"样本 {r['sample_id']}"),
                "raw_text": r.get("raw_text", ""),
                "labels": labels,
                "current_label": labels[0] if labels else None,
                "cot_text": r.get("cot_text", ""),
                "has_manual_cot": False,
            }

    raise HTTPException(status_code=404, detail="sample not found")


# --------- 3) 保存标注（这里先不真的写回文件，只是回显） ---------

@app.put("/api/v1/labeling/samples/{sample_id}/annotation")
def save_labeling_annotation(sample_id: str, body: Dict[str, Any]):
    """
    先做一个“假保存”：直接把前端传来的字段回显回去。
    以后你可以在这里把标注写入数据库或单独的 result.jsonl。
    """
    return {
        "sample_id": sample_id,
        "project_id": body.get("project_id", "p1"),
        "task_id": body.get("task_id", "default"),
        "label": body.get("label"),
        "cot_text": body.get("cot_text"),
        "source": body.get("source", "human"),
    }


# --------- 4) 生成 COT（先从原始 cot_text 里取，模拟模型生成） ---------

@app.post("/api/v1/labeling/samples/{sample_id}/cot/generate")
def generate_cot(sample_id: str, body: Dict[str, Any]):
    """
    真实情况下你会在这里调用 LLM。
    现在先从 labeling_inputs.jsonl 里读出 cot_text，当作“模型生成”的结果。
    """
    project_id = body.get("project_id", "p1")
    records = load_labeling_records(project_id)
    for r in records:
        if str(r["sample_id"]) == str(sample_id):
            return {
                "cot_text": r.get("cot_text", ""),
                "model_id": body.get("model_id", "offline-jsonl"),
                "from_cache": True,
            }

    raise HTTPException(status_code=404, detail="sample not found")
# --------- 5) 质检问题列表 ---------

@app.get("/api/v1/projects/{project_id}/qc/issues")
def list_qc_issues(project_id: str):
  issues = load_qc_issues(project_id)
  return {"items": issues, "total": len(issues)}


# --------- 6) 质检摘要（简单从标注 + qc 里算一个） ---------

@app.get("/api/v1/projects/{project_id}/qc/summary")
def get_qc_summary(project_id: str):
  # 标注数据（如果没有文件，就视为 0 样本）
  try:
      records = load_labeling_records(project_id)
  except HTTPException:
      records = []

  issues = load_qc_issues(project_id)

  total = len(records)
  labeled = total  # 目前用 jsonl 的每条都认为已标注
  cot_records = [r for r in records if r.get("cot_text")]
  cot_samples = len(cot_records)

  # 很粗糙的 token 数估计：按空格切
  if cot_samples > 0:
      lengths = [
          len((r.get("cot_text") or "").split()) for r in cot_records
      ]
      avg_tokens = int(sum(lengths) / len(lengths))
  else:
      avg_tokens = 0

  flagged = len(issues)
  auto_qc_pass_rate = 1.0
  if total > 0:
      auto_qc_pass_rate = max(0.0, 1.0 - flagged / total)

  project_name = "心血管病历结构化" if project_id == "p1" else f"项目 {project_id}"

  return {
      "projectId": project_id,
      "projectName": project_name,
      "totalSamples": total,
      "labeledSamples": labeled,
      "cotSamples": cot_samples,
      "avgCotTokens": avg_tokens,
      "autoQcPassRate": auto_qc_pass_rate,
      "flaggedSamples": flagged,
      "humanReviewed": 0,
      "interAnnotatorAgreement": 0.82,
  }
# ====================== MedThink 样本库接口 ======================

@app.get("/api/v1/projects/{project_id}/medthink/samples")
def list_medthink_samples(
    project_id: str,
    limit: int = 30,
    offset: int = 0,
):
    """
    列出 MedThink 样本（简略信息），用于前端「模型思维链样本库」列表。
    """
    samples = load_medthink_samples(project_id)
    total = len(samples)
    page = samples[offset : offset + limit]

    items = []
    for s in page:
        items.append(
            {
                "sample_id": s["sample_id"],
                "patient_id": s.get("patient_id"),
                "visit_date": s.get("visit_date"),
                "diagnosis_count": s.get("diagnosis_count", 0),
                "diagnosis_list": s.get("diagnosis_list", []),
                "has_cot_for_all": s.get("has_cot_for_all", False),
                "total_cot_tokens": s.get("total_cot_tokens", 0),
            }
        )

    return {"items": items, "total": total}


@app.get("/api/v1/medthink/samples/{sample_id}")
def get_medthink_sample(
    sample_id: str,
    project_id: str = "p1",
):
    """
    获取单条 MedThink 样本详情：病历全文 + 各诊断的 COT。
    """
    samples = load_medthink_samples(project_id)
    for s in samples:
        if str(s["sample_id"]) == str(sample_id):
            return s

    raise HTTPException(status_code=404, detail="medthink sample not found")


# ====================== Knowledge Graph（MVP：由 jsonl 构建、内存缓存） ======================

_SYM_SUFFIXES = [
    "痛",
    "热",
    "咳嗽",
    "咳痰",
    "咯血",
    "胸闷",
    "胸痛",
    "心慌",
    "心悸",
    "气促",
    "气短",
    "呼吸困难",
    "头晕",
    "乏力",
    "出汗",
    "水肿",
    "发绀",
    "恶心",
    "呕吐",
    "腹痛",
    "腹泻",
    "便血",
    "便秘",
    "尿频",
    "尿急",
    "尿痛",
    "血尿",
    "畏寒",
    "发热",
    "咽痛",
    "纳差",
    "消瘦",
    "失眠",
]


def _norm_text(s: str) -> str:
    if not s:
        return ""
    s = s.strip()
    # 统一中英文括号/冒号/空格
    s = s.replace("（", "(").replace("）", ")")
    s = s.replace("：", ":")
    s = re.sub(r"\s+", " ", s)
    # 去掉末尾问号等
    s = re.sub(r"[？?]+$", "", s)
    return s.strip()


def _extract_section(emr_text: str, key: str) -> str:
    """从 prompt 里的 pseudo-json 中抽取某个字段（主诉/现病史/体格检查/病例特点）。"""
    if not emr_text:
        return ""
    # 例如："主诉": "反复心慌、气促4年， "
    pat = re.compile(rf"\"{re.escape(key)}\"\s*:\s*\"(.*?)\"", re.DOTALL)
    m = pat.search(emr_text)
    if not m:
        return ""
    val = m.group(1)
    return val.replace("\\n", "\n").strip()


def _extract_symptoms(text: str) -> List[str]:
    """非常粗糙的症状抽取（先做 MVP）：靠常见后缀词 + 去否定。"""
    if not text:
        return []
    t = text
    # 简单去掉“无/否认/未见”等否定句中的片段（不完美，但能减少噪声）
    t = re.sub(r"(否认|无|未见|未闻及|未发现)[^。；;\n]{0,40}", " ", t)

    found: List[str] = []

    # 1) 先抓固定词（咳嗽/心慌/气促等）
    for kw in [
        "咳嗽",
        "咳痰",
        "咯血",
        "胸闷",
        "胸痛",
        "心慌",
        "心悸",
        "气促",
        "气短",
        "呼吸困难",
        "头晕",
        "乏力",
        "出汗",
        "水肿",
        "发绀",
        "恶心",
        "呕吐",
        "腹痛",
        "腹泻",
        "便血",
        "便秘",
        "尿频",
        "尿急",
        "尿痛",
        "血尿",
        "畏寒",
        "发热",
        "咽痛",
        "纳差",
        "消瘦",
        "失眠",
    ]:
        if kw in t:
            found.append(kw)

    # 2) 再用后缀抓一些“xxx痛/xxx热”这类
    for suf in _SYM_SUFFIXES:
        if suf in ("痛", "热"):
            for m in re.finditer(rf"[\u4e00-\u9fff]{{1,8}}{suf}", t):
                cand = m.group(0)
                # 过滤一些明显不是症状的（例如“检查”）
                if any(bad in cand for bad in ["检查", "诊断", "治疗", "病史"]):
                    continue
                found.append(cand)

    # 去重 + 统一
    found = [_norm_text(x) for x in found if x and len(x) <= 20]
    # 过滤过短/过泛
    found = [x for x in found if len(x) >= 2]
    return sorted(set(found))


@lru_cache(maxsize=8)
def build_kg(project_id: str) -> Dict[str, Any]:
    """从项目的 med_think_responses.jsonl 构建一个“疾病-症状”加权图。"""
    samples = load_medthink_samples(project_id)

    disease_counter = Counter()
    symptom_counter = Counter()
    edge_counter = Counter()  # (disease, symptom) -> cnt

    for s in samples:
        diseases = [
            _norm_text(d)
            for d in (s.get("diagnosis_list") or [])
            if _norm_text(d)
        ]
        if not diseases:
            continue

        emr = s.get("emr_text") or ""
        chief = _extract_section(emr, "主诉")
        hpi = _extract_section(emr, "现病史")
        pe = _extract_section(emr, "体格检查")
        feat = _extract_section(emr, "病例特点")
        symptom_text = "\n".join([chief, hpi, pe, feat]).strip()
        symptoms = _extract_symptoms(symptom_text)
        if not symptoms:
            continue

        for d in diseases:
            disease_counter[d] += 1
            for sym in symptoms:
                symptom_counter[sym] += 1
                edge_counter[(d, sym)] += 1

    # 只保留频次较高的症状，避免图太“脏”
    min_sym_freq = 3
    kept_symptoms = {s for s, c in symptom_counter.items() if c >= min_sym_freq}

    nodes = {}
    edges = []
    adj = defaultdict(set)

    def ensure_node(node_id: str, ntype: str, count: int):
        if node_id not in nodes:
            nodes[node_id] = {"id": node_id, "label": node_id, "type": ntype, "count": count}

    for d, c in disease_counter.items():
        ensure_node(d, "disease", c)
    for sym in kept_symptoms:
        ensure_node(sym, "symptom", symptom_counter[sym])

    for (d, sym), w in edge_counter.items():
        if sym not in kept_symptoms:
            continue
        edge_id = f"{d}__HAS_SYMPTOM__{sym}"
        edges.append({"id": edge_id, "source": d, "target": sym, "type": "HAS_SYMPTOM", "weight": w})
        adj[d].add(sym)
        adj[sym].add(d)

    return {
        "project_id": project_id,
        "stats": {
            "disease_nodes": len([n for n in nodes.values() if n["type"] == "disease"]),
            "symptom_nodes": len([n for n in nodes.values() if n["type"] == "symptom"]),
            "edges": len(edges),
            "min_sym_freq": min_sym_freq,
        },
        "nodes": nodes,
        "edges": edges,
        "adj": {k: list(v) for k, v in adj.items()},
    }


def _subgraph(kg: Dict[str, Any], center: str, depth: int = 1, max_nodes: int = 120):
    center = _norm_text(center)
    if not center or center not in kg["nodes"]:
        return {"nodes": [], "edges": []}

    adj = kg.get("adj") or {}
    visited = {center}
    frontier = {center}

    for _ in range(max(0, depth)):
        next_frontier = set()
        for u in frontier:
            for v in adj.get(u, []):
                if v not in visited:
                    visited.add(v)
                    next_frontier.add(v)
                if len(visited) >= max_nodes:
                    break
            if len(visited) >= max_nodes:
                break
        frontier = next_frontier
        if not frontier or len(visited) >= max_nodes:
            break

    node_list = [kg["nodes"][nid] for nid in visited if nid in kg["nodes"]]
    node_set = set(visited)
    edge_list = [
        e
        for e in kg["edges"]
        if e["source"] in node_set and e["target"] in node_set
    ]
    return {"nodes": node_list, "edges": edge_list}


@app.get("/api/v1/projects/{project_id}/kg/stats")
def kg_stats(project_id: str):
    kg = build_kg(project_id)
    return kg["stats"]


@app.get("/api/v1/projects/{project_id}/kg/search")
def kg_search(project_id: str, q: str, type: Optional[str] = None, limit: int = 20):
    kg = build_kg(project_id)
    qn = _norm_text(q)
    if not qn:
        return {"items": []}

    items = []
    for n in kg["nodes"].values():
        if type and n.get("type") != type:
            continue
        if qn in n.get("label", ""):
            items.append(n)

    items.sort(key=lambda x: (-int(x.get("count") or 0), x.get("label")))
    return {"items": items[: max(1, min(limit, 50))]}  # limit 上限 50


@app.get("/api/v1/projects/{project_id}/kg/graph")
def kg_graph(
    project_id: str,
    center: Optional[str] = None,
    depth: int = 1,
    max_nodes: int = 120,
):
    kg = build_kg(project_id)
    # 默认：返回“Top 疾病 + Top 症状”的小图，避免首次加载太大
    if not center:
        top_d = sorted(
            [n for n in kg["nodes"].values() if n.get("type") == "disease"],
            key=lambda x: -int(x.get("count") or 0),
        )[:10]
        top_s = sorted(
            [n for n in kg["nodes"].values() if n.get("type") == "symptom"],
            key=lambda x: -int(x.get("count") or 0),
        )[:12]
        seed = [n["id"] for n in top_d + top_s]
        # 把 seed 合并成一个子图（depth=1）
        visited = set(seed)
        adj = kg.get("adj") or {}
        for u in list(seed):
            for v in adj.get(u, [])[:20]:
                visited.add(v)
                if len(visited) >= max_nodes:
                    break
            if len(visited) >= max_nodes:
                break

        node_list = [kg["nodes"][nid] for nid in visited if nid in kg["nodes"]]
        node_set = set(visited)
        edge_list = [e for e in kg["edges"] if e["source"] in node_set and e["target"] in node_set]
        return {"center": None, "nodes": node_list, "edges": edge_list, "stats": kg["stats"]}

    sg = _subgraph(kg, center=center, depth=max(0, min(depth, 3)), max_nodes=max(30, min(max_nodes, 400)))
    return {"center": _norm_text(center), **sg, "stats": kg["stats"]}


@app.post("/api/v1/projects/{project_id}/kg/diagnose")
def kg_diagnose(project_id: str, body: Dict[str, Any]):
    """输入多个症状，返回可能的疾病排序（MVP：按边权求和）。"""
    kg = build_kg(project_id)
    symptoms_in = body.get("symptoms") or []
    if isinstance(symptoms_in, str):
        symptoms_in = [x.strip() for x in symptoms_in.split(",") if x.strip()]

    symptoms = [_norm_text(x) for x in symptoms_in if _norm_text(x)]
    if not symptoms:
        return {"items": []}

    # 找到“症状节点”里可匹配的（支持子串匹配）
    symptom_nodes = [n for n in kg["nodes"].values() if n.get("type") == "symptom"]
    matched = {}
    for s in symptoms:
        # 精确优先
        if s in kg["nodes"] and kg["nodes"][s].get("type") == "symptom":
            matched[s] = s
            continue
        # 子串召回
        for n in symptom_nodes:
            if s in n["label"]:
                matched[s] = n["id"]
                break

    matched_sym_nodes = sorted(set(matched.values()))
    if not matched_sym_nodes:
        return {"items": []}

    # 建 disease->symptom weight map
    d2s = defaultdict(dict)
    for e in kg["edges"]:
        if e["type"] != "HAS_SYMPTOM":
            continue
        d2s[e["source"]][e["target"]] = int(e.get("weight") or 0)

    scores = []
    for disease, smap in d2s.items():
        score = 0
        hits = []
        for sym in matched_sym_nodes:
            w = smap.get(sym)
            if w:
                score += w
                hits.append({"symptom": sym, "weight": w})
        if score > 0:
            hits.sort(key=lambda x: -x["weight"])
            scores.append({
                "disease": disease,
                "score": score,
                "hit_count": len(hits),
                "hits": hits[:10],
            })

    scores.sort(key=lambda x: (-x["score"], -x["hit_count"], x["disease"]))
    return {
        "matched": {"input": symptoms, "mapped": matched},
        "items": scores[:15],
    }


@app.post("/api/v1/projects/{project_id}/kg/refresh")
def kg_refresh(project_id: str):
    """清空构图缓存（当你替换/追加 jsonl 后使用）。"""
    build_kg.cache_clear()
    kg = build_kg(project_id)
    return {"ok": True, "stats": kg["stats"]}
