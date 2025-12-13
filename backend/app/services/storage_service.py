def get_project_dir(project_id: str) -> Path:
    return DATA_ROOT / "projects" / project_id

def get_labeling_dataset_path(project_id: str, name: str = "labeling_inputs") -> Path:
    return get_project_dir(project_id) / "labeling" / f"{name}.jsonl"
