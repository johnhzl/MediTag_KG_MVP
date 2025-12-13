import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

type NodeStatus = "idle" | "running" | "success" | "failed";

interface WorkflowNodeMeta {
  id: string;
  title: string;
  description: string;
  type: "import" | "clean" | "struct" | "cot" | "export";
  status: NodeStatus;
  inputDesc: string;
  outputDesc: string;
  lastRunAt: string;
  durationMs: number;
  sampleCount: number;
}

interface WorkflowMock {
  projectId: string;
  projectName: string;
  nodes: WorkflowNodeMeta[];
}

// 根据项目 ID 构造简单的 mock 流程
const buildMockWorkflow = (projectId: string | undefined): WorkflowMock => {
  if (!projectId) {
    return {
      projectId: "unknown",
      projectName: "未识别项目",
      nodes: [],
    };
  }

  if (projectId === "p2") {
    // 糖尿病随访记录 COT 标注
    return {
      projectId,
      projectName: "糖尿病随访记录 COT 标注",
      nodes: [
        {
          id: "n1",
          title: "原始随访记录导入",
          description: "从挂载目录导入原始 CSV，并做基础字段校验。",
          type: "import",
          status: "success",
          inputDesc: "本地目录：/mnt/data/followup/raw/",
          outputDesc: "raw_followup.csv · 8,200 条记录",
          lastRunAt: "今天 08:21",
          durationMs: 820,
          sampleCount: 8200,
        },
        {
          id: "n2",
          title: "文本清洗与脱敏",
          description:
            "统一编码、去除控制字符，对姓名/电话/住址等敏感信息做掩码。",
          type: "clean",
          status: "success",
          inputDesc: "raw_followup.csv",
          outputDesc: "clean_followup.jsonl",
          lastRunAt: "今天 08:59",
          durationMs: 1430,
          sampleCount: 8188,
        },
        {
          id: "n3",
          title: "随访问题结构化抽取",
          description:
            "使用规则 + 模型抽取『本次诉求』『用药依从性』『血糖控制情况』等关键字段。",
          type: "struct",
          status: "running",
          inputDesc: "clean_followup.jsonl",
          outputDesc: "structured_followup.jsonl",
          lastRunAt: "今天 09:17",
          durationMs: 280,
          sampleCount: 3240,
        },
        {
          id: "n4",
          title: "COT 标注输入构建",
          description:
            "为后续 COT 标注生成 prompt 输入，将结构化字段拼接为医生可读模板。",
          type: "cot",
          status: "idle",
          inputDesc: "structured_followup.jsonl",
          outputDesc: "cot_inputs.jsonl",
          lastRunAt: "尚未运行",
          durationMs: 0,
          sampleCount: 0,
        },
      ],
    };
  }

  // 默认：心血管病历结构化 等项目
  return {
    projectId,
    projectName:
      projectId === "p1"
        ? "心血管病历结构化"
        : projectId === "p3"
        ? "放射报告问答数据集"
        : "示例项目 " + projectId,
    nodes: [
      {
        id: "n1",
        title: "原始病历导入",
        description: "从医院数据平台挂载路径导入原始住院病历。",
        type: "import",
        status: "success",
        inputDesc: "挂载目录：/mnt/data/emr/raw/",
        outputDesc: "raw_emr.csv · 12,400 条记录",
        lastRunAt: "今天 08:03",
        durationMs: 960,
        sampleCount: 12400,
      },
      {
        id: "n2",
        title: "文本清洗与脱敏",
        description: "去除 HTML 标签、统一换行，对姓名/电话等做脱敏。",
        type: "clean",
        status: "success",
        inputDesc: "raw_emr.csv",
        outputDesc: "clean_emr.jsonl",
        lastRunAt: "今天 08:41",
        durationMs: 1310,
        sampleCount: 12388,
      },
      {
        id: "n3",
        title: "结构化病史抽取",
        description: "抽取主诉、现病史、既往史、过敏史等核心字段。",
        type: "struct",
        status: "running",
        inputDesc: "clean_emr.jsonl",
        outputDesc: "structured_emr.jsonl",
        lastRunAt: "今天 09:17",
        durationMs: 280,
        sampleCount: 3240,
      },
      {
        id: "n4",
        title: "导出至标注任务",
        description:
          "将结构化结果映射到「诊断结论分类 + COT 标注」任务的输入格式。",
        type: "export",
        status: "idle",
        inputDesc: "structured_emr.jsonl",
        outputDesc: "labeling_inputs.jsonl",
        lastRunAt: "尚未运行",
        durationMs: 0,
        sampleCount: 0,
      },
    ],
  };
};

const WorkflowEditorPage: React.FC = () => {
  const params = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const workflow = buildMockWorkflow(params.projectId);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    workflow.nodes[0]?.id
  );

  const selectedNode =
    workflow.nodes.find((n) => n.id === selectedNodeId) || workflow.nodes[0];

  const handleBackToProjects = () => {
    navigate("/projects");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 顶部：面包屑 + 标题 */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 4,
            }}
          >
            <span
              style={{ cursor: "pointer" }}
              onClick={handleBackToProjects}
            >
              项目管理
            </span>
            <span style={{ opacity: 0.6 }}> / </span>
            <span>{workflow.projectName}</span>
            <span style={{ opacity: 0.6 }}> / </span>
            <span style={{ color: "var(--accent)" }}>预处理流程</span>
          </div>
          <div className="page-title">
            预处理流程 · {workflow.projectName}
          </div>
          <div className="page-subtitle">
            这是一个「只在前端 mock 数据」的流程编辑草稿页，用来帮你确定页面布局和交互。后续你可以把节点列表与后端
            /api/workflows 对接。
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={handleBackToProjects}>
            <span>📁</span>
            <span>返回项目列表</span>
          </button>
          <button className="btn-ghost">
            <span>💾</span>
            <span>保存流程配置</span>
          </button>
        </div>
      </section>

      {/* 主体：左侧画布 + 右侧节点详情 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1.4fr)",
          gap: 16,
        }}
      >
        {/* 左侧：流程画布 + 简单运行记录 */}
        <div className="card" style={{ paddingBottom: 14 }}>
          <div
            style={{
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div className="card-title">流程结构 · Workflow</div>
            <span className="pill">
              <span className="pill-dot" />
              <span>示例数据 · 未接后端</span>
            </span>
          </div>

          {/* 简易水平流程图 */}
          <div
            style={{
              marginTop: 6,
              padding: "10px 4px 6px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              overflowX: "auto",
            }}
          >
            {workflow.nodes.map((node, index) => {
              const isSelected = node.id === selectedNode?.id;
              const statusLabelMap: Record<NodeStatus, string> = {
                idle: "待运行",
                running: "运行中",
                success: "已完成",
                failed: "失败",
              };
              const statusColorMap: Record<NodeStatus, string> = {
                idle: "rgba(148,163,184,0.7)",
                running: "#22c55e",
                success: "#38bdf8",
                failed: "#fb7185",
              };

              return (
                <React.Fragment key={node.id}>
                  <div
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{
                      minWidth: 210,
                      maxWidth: 230,
                      borderRadius: 16,
                      padding: "10px 11px",
                      cursor: "pointer",
                      border: isSelected
                        ? "1px solid rgba(56,189,248,0.9)"
                        : "1px solid rgba(148,163,184,0.55)",
                      background: isSelected
                        ? "radial-gradient(circle at top, #0f172a, #020617)"
                        : "linear-gradient(145deg,#020617,#020617)",
                      boxShadow: isSelected
                        ? "0 0 0 1px rgba(56,189,248,0.4), 0 18px 40px rgba(15,23,42,0.8)"
                        : "0 10px 30px rgba(15,23,42,0.5)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: 0.06,
                      }}
                    >
                      NODE {index + 1}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        marginTop: -2,
                        marginBottom: 2,
                      }}
                    >
                      {node.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        height: 32,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {node.description}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 4,
                        fontSize: 11,
                      }}
                    >
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: 999,
                          border:
                            "1px solid rgba(148,163,184,0.6)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {node.type === "import" && "导入"}
                        {node.type === "clean" && "清洗脱敏"}
                        {node.type === "struct" && "结构化"}
                        {node.type === "cot" && "COT 输入构建"}
                        {node.type === "export" && "导出到标注"}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background:
                              statusColorMap[node.status],
                          }}
                        />
                        <span
                          style={{
                            color: "var(--text-secondary)",
                          }}
                        >
                          {statusLabelMap[node.status]}
                        </span>
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        样本：{node.sampleCount.toLocaleString()}
                      </span>
                      <span>耗时：{node.durationMs || "-"} ms</span>
                    </div>
                  </div>

                  {/* 节点间连线 */}
                  {index < workflow.nodes.length - 1 && (
                    <div
                      style={{
                        minWidth: 40,
                        height: 2,
                        background:
                          "linear-gradient(to right, rgba(56,189,248,0.8), rgba(56,189,248,0.05))",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          right: -6,
                          top: -6,
                          fontSize: 14,
                          color: "var(--text-secondary)",
                        }}
                      >
                        ➜
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* 简单运行信息 */}
          <div
            style={{
              marginTop: 12,
              borderTop: "1px solid rgba(148,163,184,0.25)",
              paddingTop: 8,
              fontSize: 11,
              color: "var(--text-secondary)",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <span>说明：点击上方任一节点，可在右侧查看和编辑该节点配置。</span>
            <span>
              真实环境下，这里会展示最近几次运行记录（状态、耗时、触发人等）。
            </span>
          </div>
        </div>

        {/* 右侧：节点详情面板 */}
        <div className="card">
          {selectedNode ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div>
                  <div className="card-title">节点详情 · Node Detail</div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {selectedNode.title}
                  </div>
                </div>
                <span className="pill">
                  <span className="pill-dot" />
                  <span>只读示例 · 未接代码</span>
                </span>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                {selectedNode.description}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    padding: "8px 9px",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.8)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    输入数据
                  </div>
                  <div>{selectedNode.inputDesc}</div>
                </div>

                <div
                  style={{
                    padding: "8px 9px",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.8)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    输出数据（版本）
                  </div>
                  <div>{selectedNode.outputDesc}</div>
                </div>

                <div
                  style={{
                    padding: "8px 9px",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.8)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    最近一次运行
                  </div>
                  <div>时间：{selectedNode.lastRunAt}</div>
                  <div>耗时：{selectedNode.durationMs || "-"} ms</div>
                </div>

                <div
                  style={{
                    padding: "8px 9px",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.8)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      marginBottom: 4,
                    }}
                  >
                    样本统计
                  </div>
                  <div>
                    样本量：{selectedNode.sampleCount.toLocaleString()}
                  </div>
                  <div>状态：{selectedNode.status}</div>
                </div>
              </div>

              {/* 操作按钮（当前只是占位） */}
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button className="btn-ghost">
                  <span>▶️</span>
                  <span>模拟运行一次节点</span>
                </button>
                <button className="btn-ghost">
                  <span>👁️</span>
                  <span>查看节点输出数据预览</span>
                </button>
                <button className="btn-ghost">
                  <span>🧱</span>
                  <span>设计节点代码结构</span>
                </button>
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                说明：正式接入时，你可以在这里放「代码编辑器 / 节点参数配置
                / 运行日志」，底层对应后端的 workflow_nodes 与
                preprocessing_run 表。
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              当前流程没有任何节点，你可以在正式版本里为项目创建第一个「原始数据导入」节点。
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default WorkflowEditorPage;
