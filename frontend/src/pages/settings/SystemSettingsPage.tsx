import React from "react";

const SystemSettingsPage: React.FC = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <section>
        <div className="page-title">系统设置 · System Settings</div>
        <div className="page-subtitle">
          用于配置运行环境、数据目录、模型服务等参数。当前仅为前端占位，后续可以通过
          /api/v1/system/config 之类的接口读写配置。
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1.7fr)",
          gap: 16,
        }}
      >
        <div className="card">
          <div className="card-title">环境信息（示例）</div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.8,
            }}
          >
            <div>当前环境：dev · 无真实数据 / Mock</div>
            <div>后端服务：FastAPI @ http://localhost:8000</div>
            <div>数据根目录：backend/data</div>
            <div>默认项目：p1 · 心血管病历结构化</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">模型与质检配置（占位）</div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.8,
            }}
          >
            <p>
              这里可以配置：
            </p>
            <ul style={{ paddingLeft: 18 }}>
              <li>用于 COT 生成的离线模型 ID / API Key。</li>
              <li>各质检规则的开关、阈值（例如 COT 最小长度）。</li>
              <li>默认质检策略：全自动 / 抽样 / 重点规则优先。</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SystemSettingsPage;
