import React from "react";

const DashboardPage: React.FC = () => {
  // ================== Mock 数据 ==================
  const projectStats = {
    total: 3,
    runningPreprocess: 1,
    labeling: 1,
    qc: 1,
  };

  const pipelineStats = {
    preprocessedSamples: 12840,
    pendingSamples: 3200,
    avgPreprocessLatencyMs: 280,
    lastRunTime: "今天 09:17",
  };

  const labelingStats = {
    labeledCount: 5600,
    totalCount: 9600,
    cotCoverage: 0.82,
    avgCotTokens: 145,
  };

  const qcHighlights = [
    {
      id: 1,
      type: "预处理质检",
      title: "节点「结构化病史抽取」缺失字段较多",
      detail: "发现 3.8% 样本缺失就诊时间字段，建议补充规则或回溯原始数据。",
    },
    {
      id: 2,
      type: "标注质检",
      title: "标注员一致性偏低（诊断结论）",
      detail: "一致性为 0.71，低于项目阈值 0.8，建议复盘标注规范。",
    },
  ];

  const projects = [
    {
      id: "p1",
      name: "心血管病历结构化",
      type: "住院病历 · 中文",
      status: "预处理运行中",
      statusKey: "running",
      updatedAt: "5 分钟前",
    },
    {
      id: "p2",
      name: "糖尿病随访记录 COT 标注",
      type: "随访记录 · 中文",
      status: "标注中",
      statusKey: "labeling",
      updatedAt: "32 分钟前",
    },
    {
      id: "p3",
      name: "放射报告问答数据集",
      type: "影像报告 · 中英混合",
      status: "质检中",
      statusKey: "qc",
      updatedAt: "1 小时前",
    },
  ];

  const recentNodes = [
    {
      id: 1,
      time: "09:17",
      node: "节点 #3 · 结构化病史抽取",
      project: "心血管病历结构化",
      result: "成功 · 输出 3,240 条记录",
    },
    {
      id: 2,
      time: "08:59",
      node: "节点 #2 · 文本清洗与脱敏",
      project: "糖尿病随访记录 COT 标注",
      result: "成功 · 跳过 12 条空文本",
    },
    {
      id: 3,
      time: "08:21",
      node: "节点 #1 · 原始 CSV 导入",
      project: "放射报告问答数据集",
      result: "成功 · 导入 9,600 条",
    },
  ];

  const labelingTasks = [
    {
      id: 1,
      name: "诊断结论分类",
      project: "心血管病历结构化",
      progress: "2,300 / 4,000",
      owner: "标注员 A",
    },
    {
      id: 2,
      name: "随访建议思维链 COT",
      project: "糖尿病随访记录 COT 标注",
      progress: "1,100 / 2,800",
      owner: "协同 · 3 人",
    },
    {
      id: 3,
      name: "报告问答对抽取",
      project: "放射报告问答数据集",
      progress: "2,200 / 2,800",
      owner: "标注员 B",
    },
  ];

  const labelingProgress =
    (labelingStats.labeledCount / labelingStats.totalCount) * 100;

  // ================== JSX ==================
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 顶部标题区 */}
      <section>
        <div className="page-title">项目总览 · Dashboard</div>
        <div className="page-subtitle">
          当前页面展示的是一个完全基于 Mock 数据的示例界面，你后续可以把这里的
          mock 换成真实接口返回。
        </div>
      </section>

      {/* 第一行：关键指标卡片 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 4,
        }}
      >
        <div className="card">
          <div className="card-title">项目状态</div>
          <div className="card-main">
            <div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                {projectStats.total}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                当前在运行的医疗标注项目数量
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11 }}>
              <div>
                <span className="status-dot status-dot--running" />
                预处理运行中：{projectStats.runningPreprocess}
              </div>
              <div>
                <span className="status-dot status-dot--pending" />
                标注中：{projectStats.labeling}
              </div>
              <div>
                <span className="status-dot status-dot--qc" />
                质检中：{projectStats.qc}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">预处理流水线</div>
          <div className="card-main">
            <div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                {pipelineStats.preprocessedSamples.toLocaleString()}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                已完成预处理的样本数
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11 }}>
              <div>⏱ 平均延迟：{pipelineStats.avgPreprocessLatencyMs} ms</div>
              <div>📦 待处理：{pipelineStats.pendingSamples}</div>
              <div>🕒 最近运行：{pipelineStats.lastRunTime}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">标注进度（含思维链）</div>
          <div className="card-main">
            <div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>
                {Math.round(labelingProgress)}%
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                {labelingStats.labeledCount} / {labelingStats.totalCount} 条样本
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11 }}>
              <div>
                🧠 COT 覆盖率：
                {(labelingStats.cotCoverage * 100).toFixed(0)}%
              </div>
              <div>✍️ 平均 COT Token：{labelingStats.avgCotTokens}</div>
            </div>
          </div>
        </div>
      </section>

      {/* 第二行：质检 & 下一步提示 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.1fr) minmax(0, 1.4fr)",
          gap: 16,
        }}
      >
        {/* 质检卡片 */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <div className="card-title">质检提醒 · Highlights</div>
            <span className="pill">
              <span className="pill-dot" />
              <span>仅示例数据</span>
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {qcHighlights.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "var(--bg-surface-soft)",
                  border: "1px solid rgba(148,163,184,0.35)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    marginBottom: 4,
                  }}
                >
                  {item.type}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {item.title}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 下一步提示卡片 */}
        <div className="card">
          <div className="card-title">下一步可以做什么？</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            当前页面只依赖前端 Mock 数据，不需要后端即可展示。你可以按以下步骤逐步接入：
          </div>
          <ul
            style={{
              margin: "10px 0 0",
              paddingLeft: 18,
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
            }}
          >
            <li>在后端创建 <code>/api/projects</code> 接口，替换项目统计的 mock。</li>
            <li>在工作流模块接入预处理节点运行记录，填充预处理样本数等数据。</li>
            <li>
              在标注模块接入标注任务统计，特别是 COT（思维链）覆盖率和平均长度。
            </li>
            <li>在质检模块实现基础 QC 指标，并将结果渲染到左侧质检卡片。</li>
          </ul>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn-ghost">
              <span>📡</span>
              <span>查看接口设计</span>
            </button>
            <button className="btn-ghost">
              <span>🧩</span>
              <span>规划预处理节点</span>
            </button>
          </div>
        </div>
      </section>

      {/* 第三行：项目列表 + 最近节点运行 + 标注任务 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1.8fr)",
          gap: 16,
        }}
      >
        {/* 项目列表简版 */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <div className="card-title">项目一览 · 最近活跃</div>
            <button className="btn-ghost">
              <span>📁</span>
              <span>查看全部项目</span>
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>项目名称</th>
                <th>类型</th>
                <th>状态</th>
                <th>最近更新时间</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.type}</td>
                  <td>
                    {p.statusKey === "running" && (
                      <span className="status-dot status-dot--running" />
                    )}
                    {p.statusKey === "labeling" && (
                      <span className="status-dot status-dot--pending" />
                    )}
                    {p.statusKey === "qc" && (
                      <span className="status-dot status-dot--qc" />
                    )}
                    {p.status}
                  </td>
                  <td>{p.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 右侧：时间线 + 标注任务 */}
        <div className="card">
          <div className="card-title">最近预处理节点运行</div>
          <div className="timeline">
            {recentNodes.map((item) => (
              <div key={item.id} className="timeline-item">
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    marginBottom: 2,
                  }}
                >
                  🕒 {item.time} · {item.project}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {item.node}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    marginTop: 2,
                  }}
                >
                  {item.result}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 14,
              marginBottom: 4,
              fontSize: 11,
              color: "var(--text-secondary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>标注任务概览</span>
            <button className="btn-ghost">
              <span>✏️</span>
              <span>打开标注工作台</span>
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>任务名称</th>
                <th>所属项目</th>
                <th>进度</th>
                <th>负责人</th>
              </tr>
            </thead>
            <tbody>
              {labelingTasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.project}</td>
                  <td>{t.progress}</td>
                  <td>{t.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
