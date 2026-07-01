import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { authApi } from '../lib/mockApi';

export default function ResetAdminPage() {
  const [message, setMessage] = useState('');

  const handleReset = async () => {
    try {
      // 检查是否已有管理员
      const { data: existingAdmins } = await supabase
        .from('users')
        .select('id, username')
        .eq('role', 'admin');

      if (existingAdmins && existingAdmins.length > 0) {
        // admin 存在，通过 Supabase Auth 重置密码
        // 由于我们用 email+password 认证，需要让用户通过"忘记密码"功能重置
        setMessage(`已找到管理员账号: ${existingAdmins.map((u: any) => u.username).join(', ')}\n\n提示：如需重置密码，请在 Supabase 控制台 → Authentication → Users 中操作。`);
        return;
      }

      // 不存在，创建新的 admin
      const result = await authApi.register({
        username: 'admin',
        displayName: '管理员',
        school: '',
        password: 'admin',
        confirmPassword: 'admin',
      });

      if (result.success) {
        setMessage('✅ admin 账号创建成功！\n\n用户名: admin\n密码: admin\n\n请返回登录页面登录。');
      } else {
        setMessage('❌ 创建失败: ' + result.message);
      }
    } catch (error: any) {
      setMessage('❌ 操作失败: ' + error.message);
    }
  };

  const handleViewUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, role, display_name, school');
      
      if (error) throw error;
      const users = data || [];
      setMessage(`用户列表:\n${users.map((u: any) => `- ${u.username} (${u.role}) - ${u.display_name || ''}`).join('\n')}\n\n共 ${users.length} 个用户`);
    } catch (e: any) {
      setMessage('获取失败: ' + e.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold text-center mb-8">管理员账号恢复工具</h1>

        <button
          onClick={handleReset}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          恢复/重置 admin 账号
        </button>

        <button
          onClick={handleViewUsers}
          className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          查看所有用户
        </button>

        {message && (
          <pre className="text-sm p-4 bg-gray-100 rounded-lg whitespace-pre-wrap break-all">
            {message}
          </pre>
        )}

        <a
          href="/"
          className="block text-center text-blue-600 hover:underline mt-4"
        >
          返回首页
        </a>

        <div className="text-sm text-gray-500 mt-4 p-4 bg-yellow-50 rounded">
          <p className="font-bold">说明（Supabase 版本）：</p>
          <p>1. 点击"恢复/重置 admin 账号"按钮</p>
          <p>2. 如果 admin 不存在，会自动创建（密码: admin）</p>
          <p>3. 数据存储在云端，所有用户共享同一数据库</p>
          <p>4. 创建后返回首页登录即可</p>
        </div>
      </div>
    </div>
  );
}
