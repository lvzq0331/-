// 用户类型定义

export type UserRole = 'admin' | 'collaborator';

export interface User {
  id: string;
  username: string;
  displayName: string;
  school: string;
  role: UserRole;
  createdAt: string;
}

/** 注册表单 */
export interface RegisterFormData {
  username: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  school: string;
}

/** 登录表单 */
export interface LoginFormData {
  username: string;
  password: string;
}
