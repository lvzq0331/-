// 协作者个人空间 - 显示自己上传的所有题目（含已驳回）
import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { questionApi } from '@/lib/mockApi';
import type { Question, Grade, Semester, TextbookVersion } from '@/types';
import {
  GRADES, SEMESTERS, TEXTBOOK_VERSIONS, QUESTION_TYPES,
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BookOpen, CheckCircle2, Clock, AlertCircle, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function PersonalSpacePage() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // 获取当前用户创建的所有题目（包括待审、已发布、已驳回）
        const result = await questionApi.list({ page: 1, pageSize: 1000 });
        const myQuestions = result.data.filter(q => q.creatorId === user.id);
        setQuestions(myQuestions);
      } catch (e) {
        toast.error('加载题目失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const filtered = useMemo(() => {
    let list = questions;
    if (filterGrade !== 'all') list = list.filter(q => q.grade === filterGrade);
    if (filterType !== 'all') list = list.filter(q => q.questionType === filterType);
    if (filterStatus !== 'all') list = list.filter(q => q.status === filterStatus);
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      list = list.filter(q =>
        q.contentText.toLowerCase().includes(kw) ||
        q.knowledgePoints.some(kp => kp.toLowerCase().includes(kw))
      );
    }
    return list;
  }, [questions, filterGrade, filterType, filterStatus, keyword]);

  const stats = useMemo(() => ({
    total: questions.length,
    published: questions.filter(q => q.status === 'published').length,
    pending: questions.filter(q => q.status === 'pending').length,
    rejected: questions.filter(q => q.status === 'rejected').length,
  }), [questions]);

  // 重新提交（修改后将状态改回 pending）
  const handleResubmit = async (id: string) => {
    try {
      const result = await questionApi.resubmit(id);
      if (result) {
        toast.success('题目已重新提交，等待管理员审核');
        // 重新加载
        const allResult = await questionApi.list({ page: 1, pageSize: 1000 });
        const myQuestions = allResult.data.filter(q => q.creatorId === user!.id);
        setQuestions(myQuestions);
      } else {
        toast.error('操作失败');
      }
    } catch (e) {
      toast.error('操作失败');
    }
  };

  if (!user) return <div className="p-8 text-center text-gray-400">请先登录</div>;

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">个人空间</h1>
          <p className="text-sm text-gray-500 mt-1">{user.displayName} · {user.school || ''}</p>
        </div>
        <div className="grid grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* 标题 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">个人空间</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user.displayName} · {user.school || ''}
            · 共上传 {stats.total} 道题目
          </p>
        </div>
        <Button onClick={() => navigate('/questions/create')}>
          <Plus className="w-4 h-4 mr-1" />
          新建题目
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-gray-500">全部题目</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
              <div className="text-xs text-gray-500">已审核通过</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <div className="text-xs text-gray-500">待审核</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-xs text-gray-500">已驳回</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="搜索题目内容或知识点..."
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="年级" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部年级</SelectItem>
                {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[110px]"><SelectValue placeholder="题型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部题型</SelectItem>
                {QUESTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[110px]"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待审</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
                <SelectItem value="rejected">已驳回</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs text-gray-400 whitespace-nowrap">
              筛选结果：{filtered.length} 题
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表 */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">还没有上传任何题目</p>
            <p className="text-sm text-gray-400 mt-1">点击右上角"新建题目"开始添加</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(question => (
            <Card key={question.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 标签行 */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="secondary">{question.questionType}</Badge>
                      <Badge variant="outline" className={
                        `border-yellow-300 ${question.difficulty >= 4 ? 'text-red-600' : question.difficulty <= 2 ? 'text-green-600' : 'text-yellow-600'}`
                      }>
                        {'★'.repeat(question.difficulty)}{'☆'.repeat(5 - question.difficulty)}
                      </Badge>
                      {question.isFrequentMistake && <Badge variant="destructive" className="text-xs">高频易错</Badge>}
                      {question.status === 'pending' && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">待审</Badge>
                      )}
                      {question.status === 'published' && (
                        <Badge variant="outline" className="text-green-600 border-green-300">已发布</Badge>
                      )}
                      {question.status === 'rejected' && (
                        <Badge variant="destructive">已驳回</Badge>
                      )}
                    </div>
                    {/* 内容 */}
                    <p className="text-sm font-medium line-clamp-2 mb-1 whitespace-pre-line">{question.contentText}</p>
                    {/* 驳回原因 */}
                    {question.status === 'rejected' && question.rejectionReason && (
                      <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <span className="font-medium">驳回原因：</span>{question.rejectionReason}
                      </div>
                    )}
                    {/* 知识点 + 元信息 */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1 flex-wrap flex-1 min-w-0">
                        {question.knowledgePoints.map(kp => (
                          <span key={kp} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{kp}</span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        {question.grade}{question.semester} · {question.textbookVersion}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {/* 待审：可编辑 */}
                    {question.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/questions/${question.id}/edit`)}>
                        <Pencil className="w-4 h-4" />
                        编辑
                      </Button>
                    )}
                    {/* 已驳回：修改后可重新提交 */}
                    {question.status === 'rejected' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/questions/${question.id}/edit`)}>
                          <Pencil className="w-4 h-4 mr-1" />
                          修改
                        </Button>
                        <Button size="sm" onClick={() => handleResubmit(question.id)}>
                          重新提交
                        </Button>
                      </div>
                    )}
                    {/* 已发布：只读 */}
                    {question.status === 'published' && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" title="已通过审核" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
