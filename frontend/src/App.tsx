import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ProjectListPage from "./pages/projects/ProjectListPage";
import WorkflowEditorPage from "./pages/workflow/WorkflowEditorPage";
import WorkflowLandingPage from "./pages/workflow/WorkflowLandingPage";
import LabelingWorkspacePage from "./pages/labeling/LabelingWorkspacePage";
import QualityCenterPage from "./pages/qc/QualityCenterPage";
import SystemSettingsPage from "./pages/settings/SystemSettingsPage";
import MedThinkSamplesPage from "./pages/medthink/MedThinkSamplesPage";
import KnowledgeGraphPage from "./pages/kg/KnowledgeGraphPage";


const App: React.FC = () => {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* 项目 */}
        <Route path="/projects" element={<ProjectListPage />} />
        <Route
          path="/projects/:projectId/workflow"
          element={<WorkflowEditorPage />}
        />

        {/* 预处理流程入口页（侧边栏按钮） */}
        <Route path="/workflows" element={<WorkflowLandingPage />} />

        {/* 标注工作台：通用入口 & 按项目入口 */}
        <Route path="/labeling" element={<LabelingWorkspacePage />} />
        <Route
          path="/projects/:projectId/labeling"
          element={<LabelingWorkspacePage />}
        />
        <Route path="/medthink" element={<MedThinkSamplesPage />} /> 

        {/* 知识图谱 */}
        <Route path="/kg" element={<KnowledgeGraphPage />} />
        <Route path="/projects/:projectId/kg" element={<KnowledgeGraphPage />} />

        {/* 质检中心（侧边栏「质检中心」） */}
        <Route path="/qc" element={<QualityCenterPage />} />

        {/* 系统设置 */}
        <Route path="/settings" element={<SystemSettingsPage />} />
      </Routes>
    </AppLayout>
  );
};

export default App;
