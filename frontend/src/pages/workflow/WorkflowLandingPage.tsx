import React from "react";
import { useNavigate } from "react-router-dom";

const WorkflowLandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <section>
        <div className="page-title">预处理流程 · Workflow 概览</div>
        <div className="page-subtitle">
          当前页面作为入口占位：建议先在「项目管理」中选择一个项目，再进入该项目的预处理流程。
          后续你可以在这里做一个所有项目流程的总览或流程模板管理。
        </div>
      </section>

      <section className="card" style={{ maxWidth: 560 }}>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 10,
          }}
        >
          你可以从这里开始：
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.8,
          }}
        >
          <li>在「项目管理」中选择一个示例项目，点击「预处理流程」。</li>
          <li>为新项目设计一条 Linear 的预处理流水线：导入 → 清洗 → 结构化 → 导出。</li>
          <li>后续可以在此放置「流程模板中心」，一键复制到指定项目。</li>
        </ul>

        <div style={{ marginTop: 14 }}>
          <button
            className="btn-ghost"
            onClick={() => navigate("/projects")}
          >
            <span>📁</span>
            <span>前往项目管理</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default WorkflowLandingPage;
