// 登录/注册页（双模式切换）
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/mockApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, UserPlus, LogIn } from 'lucide-react';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [school, setSchool] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore(s => s.login);
  const navigate = useNavigate();

  // 切换模式时清空表单和错误
  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setSchool('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    if (mode === 'register') {
      if (!displayName) {
        setError('请输入姓名/昵称');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      if (password.length < 4) {
        setError('密码至少需要 4 位');
        return;
      }
    }

    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));

    try {
      if (mode === 'login') {
        const result = await login(username, password);
        setIsLoading(false);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.message);
        }
      } else {
        const result = await authApi.register({
          username,
          password,
          confirmPassword,
          displayName,
          school,
        });
        setIsLoading(false);
        if (result.success) {
          // 注册成功后自动登录
          const lr = await login(username, password);
          if (lr.success) {
            navigate('/');
          } else {
            switchMode('login');
            setError('注册成功，请登录');
          }
        } else {
          setError(result.message || '注册失败，请重试');
        }
      }
    } catch (e: any) {
      setIsLoading(false);
      console.error('[LoginPage] 异常:', e);
      setError(e?.message || '操作失败，请检查网络连接后重试');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">数学题库系统</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? '登录后开始使用' : '创建新账号'}
          </p>

          {/* 模式切换标签 */}
          <div className="flex bg-gray-100 rounded-lg p-1 mt-4 mx-auto w-fit">
            <button
              onClick={() => switchMode('login')}
              className={`flex items-center gap-1 px-5 py-1.5 text-sm rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-white shadow-sm font-medium text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> 登录
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex items-center gap-1 px-5 py-1.5 text-sm rounded-md transition-all ${
                mode === 'register'
                  ? 'bg-white shadow-sm font-medium text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> 注册
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">

            {/* 注册时显示姓名 */}
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">姓名 / 昵称 <span className="text-red-400">*</span></Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="如：张老师"
                />
              </div>
            )}

            {/* 用户名 */}
            <div className="space-y-2">
              <Label htmlFor="username">用户名 <span className="text-red-400">*</span></Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoFocus
              />
            </div>

            {/* 密码 */}
            <div className="space-y-2">
              <Label htmlFor="password">密码 <span className="text-red-400">*</span></Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="至少 4 位密码"
              />
            </div>

            {/* 确认密码（仅注册） */}
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码 <span className="text-red-400">*</span></Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                />
              </div>
            )}

            {/* 学校（注册可选） */}
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="school">学校（选填）</Label>
                <Input
                  id="school"
                  value={school}
                  onChange={e => setSchool(e.target.value)}
                  placeholder="请输入学校名称"
                />
              </div>
            )}

            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? mode === 'login' ? '登录中...' : '注册中...'
                : mode === 'login' ? '登录' : '立即注册'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
