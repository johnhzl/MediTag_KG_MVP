import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ProjectStatusKey = "all" | "preprocess" | "labeling" | "qc" | "archived";

interface ProjectItem {
  id: string;
  name: string;
  type: string;
  tags: string[];
  status: ProjectStatusKey;
  statusLabel: string;
  samples: number;
  createdAt: string;
  updatedAt: string;
  owner: string;
}

const mockProjects: ProjectItem[] = [
  {
    id: "p1",
    name: "心血管病历结构化",
    type: "住院病历 · 中文",
    tags: ["结构化", "诊断结论", "公开示例"],
    status: "preprocess",
    statusLabel: "预处理运行中",
    samples: 12400,
    createdAt: "2025-02-13",
    updatedAt: "5 分钟前",
    owner: "数据组 · 王医生",
  },
  {
    id: "p2",
    name: "糖尿病随访记录 COT 标注",
    type: "随访记录 · 中文",
    tags: ["COT", "问答", "随访"],
    status: "labeling",
    statusLabel: "标注中",
    samples: 8200,
    createdAt: "2025-02-02",
    updatedAt: "32 分钟前",
    owner: "标注组 · A 班",
  },
  {
    id: "p3",
    name: "放射报告问答数据集",
    type: "影像报告 · 中英混合",
    tags: ["问答", "报告抽取"],
    status: "qc",
    statusLabel: "质检中",
    samples: 9600,
    createdAt: "2025-01-20",
    updatedAt: "1 小时前",
    owner: "质检组 · 李工",
  },
  {
    id: "p4",
    name: "急诊病历 triage 分类",
    type: "急诊记录 · 中文",
    tags: ["分类", "triage"],
    status: "archived",
    statusLabel: "已归档",
    samples: 4600,
    createdAt: "2024-12-11",
    updatedAt: "2025-01-03",
    owner: "数据组 · 备份项目",
  },
];

const statusFilters: { key: ProjectStatusKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "preprocess", label: "预处理" },
  { key: "labeling", label: "标注中" },
  { key: "qc", label: "质检中" },
  { key: "archived", label: "已归档" },
];

const getStatusBadge = (status: ProjectStatusKey) => {
  switch (status) {
    case "preprocess":
      return {
        text: "预处理",
        color: "#22c55e",
      };
    case "labeling":
      return {
        text: "标注中",
        color: "#fbbf24",
      };
    case "qc":
      return {
        text: "质检中",
        color: "#38bdf8",
      };
    case "archived":
      return {
        text: "已归档",
        color: "#9ca3af",
      };
    default:
      return {
        text: "未知状态",
        color: "#6b7280",
      };
  }
};

const ProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ProjectStatusKey>("all");

  const filteredProjects = useMemo(() => {
    return mockProjects.filter((p) => {
      const matchStatus =
        statusFilter === "all" ? true : p.status === statusFilter;
      const matchKeyword = keyword.trim()
        ? (p.name + p.type + p.tags.join(" ")).includes(
            keyword.trim()
          )
        : true;
      return matchStatus && matchKeyword;
    });
  }, [keyword, statusFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 标题 & 统计 */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        <div>
          <div className="page-title">项目管理 · Project List</div>
          <div className="page-subtitle">
            这里列出的是前端 Mock 的示例项目。后续你可以把 mock
            数据替换成 /api/projects 接口返回结果。
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            textAlign: "right",
          }}
        >
          <div>当前示例项目数：{mockProjects.length}</div>
          <div>
            实际接入时，可按「创建时间 / 更新时间 / 标注进度」排序和筛选。
          </div>
        </div>
      </section>

      {/* 筛选条 */}
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* 状态筛选 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {statusFilters.map((s) => (
            <button
              key={s.key}
              className="btn-ghost"
              style={{
                fontSize: 12,
                padding: "5px 10px",
                background:
                  statusFilter === s.key
                    ? "rgba(56,189,248,0.12)"
                    : "transparent",
                borderColor:
                  statusFilter === s.key
                    ? "rgba(56,189,248,0.9)"
                    : "rgba(148,163,184,0.4)",
              }}
              onClick={() => setStatusFilter(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 搜索框 + 新建按钮 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 260,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.6)",
              background: "rgba(15,23,42,0.95)",
            }}
          >
            <span style={{ fontSize: 13 }}>🔍</span>
            <input
              placeholder="按项目名称 / 类型 / 标签搜索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: 12,
              }}
            />
          </div>

          <button className="btn-ghost">
            <span>➕</span>
            <span>新建项目</span>
          </button>
        </div>
      </section>

      {/* 项目卡片列表 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {filteredProjects.map((p) => {
          const badge = getStatusBadge(p.status);
          return (
            <div
              key={p.id}
              className="card"
              style={{
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* 第一行：标题 + 状态 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 2,
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {p.type}
                  </div>
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 9px",
                    borderRadius: 999,
                    border:
                      "1px solid rgba(148,163,184,0.6)",
                    fontSize: 11,
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: badge.color,
                    }}
                  />
                  <span>{badge.text}</span>
                </div>
              </div>

              {/* 标签 */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 2,
                }}
              >
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 999,
                      border:
                        "1px solid rgba(148,163,184,0.4)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* 底部信息 */}
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                <div>
                  <div>
                    样本量：{p.samples.toLocaleString()}
                  </div>
                  <div>负责人：{p.owner}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>创建时间：{p.createdAt}</div>
                  <div>最近更新：{p.updatedAt}</div>
                </div>
              </div>

              {/* 操作区 */}
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button
                  className="btn-ghost"
                  onClick={() =>
                    navigate(`/projects/${p.id}/workflow`)
                  }
                >
                  <span>🧬</span>
                  <span>预处理流程</span>
                </button>
                <button className="btn-ghost">
                  <span>✏️</span>
                  <span>打开标注</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div
            className="card"
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-secondary)",
              padding: "20px 16px",
            }}
          >
            当前筛选条件下没有项目，可以尝试清空关键字或切换状态。
          </div>
        )}
      </section>
    </div>
  );
};

export default ProjectListPage;
