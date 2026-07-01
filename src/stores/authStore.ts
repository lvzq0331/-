// 认证 Store — 纯数据库版本（无需邮箱）
import { create } from 'zustand';
import type { User } from '@/types';
import { authApi } from '@/lib/mockApi'; // 实际从 supabaseApi 导出

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (data: { username: string; password: string; confirmPassword: string; displayName: string; school: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  loading: true,

  // 登录
  login: async (username, password) => {
    const result = await authApi.login({ username, password });
    if (result.success && result.user) {
      set({ user: result.user, isLoggedIn: true });
      localStorage.setItem('mqb_current_user', JSON.stringify(result.user));
    }
    return result;
  },

  // 注册
  register: async (data) => {
    const result = await authApi.register(data);
    if (result.success && result.user) {
      set({ user: result.user, isLoggedIn: true });
      localStorage.setItem('mqb_current_user', JSON.stringify(result.user));
    }
    return result;
  },

  // 退出登录
  logout: async () => {
    await authApi.logout();
    set({ user: null, isLoggedIn: false });
    localStorage.removeItem('mqb_current_user');
  },

  // 检查认证状态（页面加载时调用）
  checkAuth: async () => {
    try {
      // 尝试从 Supabase 数据库获取当前用户
      const user = await authApi.getCurrentUser();
      if (user) {
        set({ user, isLoggedIn: true, loading: false });
        localStorage.setItem('mqb_current_user', JSON.stringify(user));
        return;
      }
    } catch (e) {
      console.warn('检查登录状态失败:', e);
    }

    // 回退：从 localStorage 恢复
    try {
      const cached = localStorage.getItem('mqb_current_user');
      if (cached && cached !== 'null' && cached !== 'undefined') {
        const user = JSON.parse(cached);
        set({ user, isLoggedIn: true, loading: false });
        return;
      }
    } catch (e) {
      // ignore parse errors
    }

    set({ user: null, isLoggedIn: false, loading: false });
  },
}));
