import React from "react";

const Header: React.FC = () => {
  return (
    <header
      style={{
        height: "var(--header-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px 0 20px",
        borderBottom: "1px solid rgba(148,163,184,0.2)",
        background:
          "linear-gradient(to right, rgba(15,23,42,0.95), rgba(15,23,42,0.6))",
        backdropFilter: "blur(20px)",
      }}
    >
      <div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          当前项目
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 16,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>示例 · 心血管病历结构化</span>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.5)",
              color: "var(--text-secondary)",
            }}
          >
            无真实数据 / Mock
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn-ghost">
          <span>🧪</span>
          <span>快速体验预处理</span>
        </button>
        <button className="btn-ghost">
          <span>➕</span>
          <span>新建项目</span>
        </button>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            background:
              "radial-gradient(circle at 30% 0%, #38bdf8, #1e293b 55%)",
          }}
        >
          Z
        </div>
      </div>
    </header>
  );
};

export default Header;
