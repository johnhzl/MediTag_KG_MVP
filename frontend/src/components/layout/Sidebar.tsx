import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { path: "/dashboard", label: "总览", icon: "📊" },
  { path: "/projects", label: "项目管理", icon: "📁" },
  { path: "/workflows", label: "预处理流程", icon: "🧬" },
  { path: "/labeling", label: "数据标注", icon: "✏️" },
  { path: "/kg", label: "知识图谱", icon: "🕸️" },
  { path: "/qc", label: "质检中心", icon: "🛡️" },
  { path: "/settings", label: "系统设置", icon: "⚙️" },
];

const Sidebar: React.FC = () => {
  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        background:
          "radial-gradient(circle at top, #1d2235 0, var(--bg-sidebar) 45%)",
        borderRight: "1px solid rgba(148,163,184,0.25)",
        padding: "18px 14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 10px 10px",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background:
              "conic-gradient(from 180deg, #38bdf8, #a855f7, #ec4899, #38bdf8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          M
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>MediTag Studio</span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              opacity: 0.9,
            }}
          >
            医疗文本标注平台
          </span>
        </div>
      </div>

      <nav style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              marginBottom: 4,
              fontSize: 13,
              borderRadius: 999,
              color: isActive ? "#e5e7eb" : "var(--text-secondary)",
              textDecoration: "none",
              background: isActive ? "var(--accent-soft)" : "transparent",
              border: isActive
                ? "1px solid rgba(56,189,248,0.8)"
                : "1px solid transparent",
              transition:
                "background var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)",
              transform: isActive ? "translateX(1px)" : "translateX(0)",
            })}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary)",
          borderTop: "1px solid rgba(148,163,184,0.2)",
          paddingTop: 10,
          marginTop: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>当前环境</span>
          <span style={{ color: "#a5b4fc" }}>dev</span>
        </div>
        <div style={{ marginTop: 4 }}>无真实数据 · 使用示例统计</div>
      </div>
    </aside>
  );
};

export default Sidebar;
