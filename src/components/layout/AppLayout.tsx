// 全局布局组件
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import BasketFloatingBall from '@/components/exam/BasketFloatingBall';
import {
  BookOpen, FileText, Plus, ClipboardList, Tags, LogOut, Home,
  LayoutDashboard, BookMarked, CheckCircle, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: '仪表盘', icon: LayoutDashboard },
    { to: '/questions', label: '题库', icon: BookOpen },
    { to: '/questions/create', label: '新建题目', icon: Plus },
    { to: '/exams', label: '试卷', icon: ClipboardList },
    ...(user?.role === 'admin' ? [{ to: '/questions/review', label: '待审池', icon: CheckCircle }] : []),
    { to: '/tags', label: '标签管理', icon: Tags },
    ...(user?.role !== 'admin' ? [{ to: '/my-space', label: '个人空间', icon: User }] : []),
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* 侧边栏 */}
      <aside className="w-56 bg-white border-r flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-blue-700 flex items-center gap-2">
            <BookMarked className="w-5 h-5" />
            数学题库
          </h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <div className="text-xs text-gray-500 mb-1">{user?.displayName || user?.username}</div>
          {user?.school && (
            <div className="text-xs text-gray-400 mb-2 truncate" title={user.school}>{user.school}</div>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-red-500 hover:text-red-600">
            <LogOut className="w-4 h-4 mr-2" /> 退出登录
          </Button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* 试卷篮悬浮球 */}
      <BasketFloatingBall />
    </div>
  );
}
