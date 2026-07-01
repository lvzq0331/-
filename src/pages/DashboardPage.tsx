// 仪表盘页面（Supabase 版本 - 异步数据加载）
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { questionApi, examPaperApi } from '@/lib/mockApi';
import { LayoutDashboard, BookOpen, ClipboardList, TrendingUp, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, papers: 0 });
  const [recentQuestions, setRecentQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [questionsRes, papersRes, pendingRes] = await Promise.all([
          questionApi.list({ status: 'published', pageSize: 1000 }),
          examPaperApi.list(),
          questionApi.listPending(),
        ]);
        setStats({
          total: questionsRes.total,
          published: questionsRes.total,
          pending: pendingRes.length,
          papers: papersRes.length,
        });
        setRecentQuestions(questionsRes.data.slice(0, 5));
      } catch (e) {
        console.error('加载仪表盘数据失败:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const quickActions = [
    { label: '新建题目', to: '/questions/create', icon: Plus },
    { label: '题库列表', to: '/questions', icon: BookOpen },
    { label: '创建试卷', to: '/exams/create', icon: ClipboardList },
    { label: '试卷列表', to: '/exams', icon: FileText },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">欢迎回来，{user?.displayName || user?.username}！</h1>
        <p className="text-gray-500 mt-1">数学题库系统 — 让出题更高效</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '总题数', value: stats.total, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '已入库', value: stats.published, icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '待审核', value: stats.pending, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: '试卷', value: stats.papers, icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 快捷操作 */}
      <h2 className="text-lg font-semibold mb-3">快捷操作</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {quickActions.map(a => (
          <Button key={a.to} variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate(a.to)}>
            <a.icon className="w-5 h-5" />
            {a.label}
          </Button>
        ))}
      </div>

      {/* 最近题目 */}
      <h2 className="text-lg font-semibold mb-3">最近题目</h2>
      <Card>
        <CardContent className="p-0">
          {recentQuestions.map((q, i) => (
            <div key={q.id} className={`p-3 flex items-start gap-3 ${i < recentQuestions.length - 1 ? 'border-b' : ''}`}>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 shrink-0">{q.questionType}</span>
              <span className="text-sm flex-1 line-clamp-1">{q.contentText}</span>
              <span className="text-xs text-gray-400 shrink-0">{q.grade}{q.semester}</span>
            </div>
          ))}
          {recentQuestions.length === 0 && (
            <div className="p-8 text-center text-gray-400">暂无题目，点击「新建题目」开始添加</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
