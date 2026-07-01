// API 层 — 统一出口
// 已从 localStorage (mockApi) 迁移到 Supabase 云端数据库
// 保持原有导出接口不变，所有页面组件无需修改

export { authApi, questionApi, tagApi, examPaperApi } from './supabaseApi';
