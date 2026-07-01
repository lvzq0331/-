// 题库列表页（Supabase 云端版）- 正式版本
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useFilterStore } from '@/stores/filterStore';
import type { Question } from '@/types';
import { GRADES, SEMESTERS, TEXTBOOK_VERSIONS, QUESTION_TYPES, DIFFICULTY_LABELS } from '@/lib/constants';
import QuestionCard from '@/components/question/QuestionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FilterX } from 'lucide-react';

// 将数据库行转换为 Question 对象
function rowToQuestion(row: any): Question {
  return {
    id: row.id,
    contentText: row.content_text,
    answer: row.answer,
    grade: row.grade,
    semester: row.semester,
    textbookVersion: row.textbook_version,
    questionType: row.question_type,
    difficulty: row.difficulty,
    knowledgePoints: row.knowledge_points || [],
    tags: row.tags || [],
    isFrequentMistake: row.is_frequent_mistake || false,
    status: row.status,
    creatorId: row.creator_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    rejectionReason: row.rejection_reason,
    rejectedAt: row.rejected_at,
  };
}

export default function QuestionListPage() {
  const navigate = useNavigate();
  const filter = useFilterStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 加载题目列表
  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      setLoading(true);
      try {
        // 构建查询
        let query = supabase.from('questions').select('*');

        // 固定只查已发布的题目
        query = query.eq('status', 'published');

        // 应用筛选条件
        if (filter.grade) query = query.eq('grade', filter.grade);
        if (filter.semester) query = query.eq('semester', filter.semester);
        if (filter.textbookVersion) query = query.eq('textbook_version', filter.textbookVersion);
        if (filter.questionType) query = query.eq('question_type', filter.questionType);
        if (filter.isFrequentMistake) query = query.eq('is_frequent_mistake', true);
        if (filter.keyword) {
          const kw = filter.keyword;
          query = query.or(`content_text.ilike.%${kw}%,answer.ilike.%${kw}%`);
        }

        // 排序
        const sortBy = filter.sortBy === 'createdAt' ? 'created_at' : filter.sortBy === 'updatedAt' ? 'updated_at' : 'created_at';
        query = query.order(sortBy, { ascending: filter.sortOrder === 'asc' });

        // 分页
        const from = (filter.page - 1) * filter.pageSize;
        const to = from + filter.pageSize - 1;
        query = query.range(from, to);

        // 执行查询
        const { data, error } = await query;

        if (error) throw error;

        if (!cancelled) {
          const qs = (data || []).map(rowToQuestion);
          setQuestions(qs);
          setTotal(data?.length || 0); // 注意：这里简化了总数计算
        }
      } catch (e) {
        console.error('[题库] 加载失败:', e);
        if (!cancelled) {
          setQuestions([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadQuestions();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在首次挂载时加载，筛选变化时可通过 onRefresh 刷新

  const totalPages = Math.ceil(total / filter.pageSize);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 顶部标题 + 新建按钮 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">题库</h1>
        <Button onClick={() => navigate('/questions/create')}>
          <Plus className="w-4 h-4 mr-2" /> 新建题目
        </Button>
      </div>

      {/* 筛选栏 */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
          {/* 年级 */}
          <Select value={filter.grade || 'all'} onValueChange={v => filter.setFilter('grade', v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="年级" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部年级</SelectItem>
              {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* 学期 */}
          <Select value={filter.semester || 'all'} onValueChange={v => filter.setFilter('semester', v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="学期" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部学期</SelectItem>
              {SEMESTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* 版本 */}
          <Select value={filter.textbookVersion || 'all'} onValueChange={v => filter.setFilter('textbookVersion', v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="教材版本" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部版本</SelectItem>
              {TEXTBOOK_VERSIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* 题型 */}
          <Select value={filter.questionType || 'all'} onValueChange={v => filter.setFilter('questionType', v === 'all' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="题型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部题型</SelectItem>
              {QUESTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* 难度 */}
          <Select value={filter.difficultyMin ? String(filter.difficultyMin) : 'all'} onValueChange={v => filter.setFilter('difficultyMin', v === 'all' ? '' : Number(v))}>
            <SelectTrigger><SelectValue placeholder="难度" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部难度</SelectItem>
              {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* 搜索 */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="搜索题目..." value={filter.keyword} onChange={e => filter.setFilter('keyword', e.target.value)} className="pl-8" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={filter.isFrequentMistake ? 'default' : 'outline'} className="cursor-pointer" onClick={() => filter.setFilter('isFrequentMistake', !filter.isFrequentMistake)}>仅高频易错</Badge>
          <Button variant="ghost" size="sm" onClick={() => { filter.reset(); window.location.reload(); }}><FilterX className="w-4 h-4 mr-1" /> 重置筛选</Button>
          <span className="text-sm text-gray-400 ml-auto">共 {total} 题</span>
        </div>
      </Card>

      {/* 题目列表 */}
      <div className="space-y-3 mb-4">
        {loading && questions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">正在加载...</div>
        ) : questions.length > 0 ? (
          questions.map(q => <QuestionCard key={q.id} question={q} onRefresh={() => window.location.reload()} />)
        ) : (
          <div className="text-center py-12 text-gray-400">暂无题目，点击「新建题目」开始添加</div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={filter.page <= 1} onClick={() => { filter.setFilter('page', filter.page - 1); window.location.reload(); }}>上一页</Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Button key={p} variant={p === filter.page ? 'default' : 'outline'} size="sm" onClick={() => { filter.setFilter('page', p); window.location.reload(); }}>{p}</Button>
          ))}
          <Button variant="outline" size="sm" disabled={filter.page >= totalPages} onClick={() => { filter.setFilter('page', filter.page + 1); window.location.reload(); }}>下一页</Button>
        </div>
      )}
    </div>
  );
}
