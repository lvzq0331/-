// 试卷编辑页 — 编辑标题、描述、题目顺序、分值
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examPaperApi, questionApi } from '@/lib/mockApi';
import type { ExamPaper, Question, ExamPaperQuestionInput } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBasketStore } from '@/stores/basketStore';

export default function ExamPaperEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalScore, setTotalScore] = useState(100);
  const [saving, setSaving] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // 题目分值编辑
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});

  const clearBasket = useBasketStore(s => s.clear);

  useEffect(() => {
    if (!id) return;
    const p = examPaperApi.getById(id);
    if (!p) {
      toast.error('试卷不存在');
      navigate('/exams');
      return;
    }
    setPaper(p);
    setTitle(p.title);
    setDescription(p.description || '');
    setTotalScore(p.totalScore);
    setShowAnswer(p.includeSolution || false);

    // 加载题目
    const allQuestions = questionApi.list({ status: 'published' }).data;
    const qMap = new Map(allQuestions.map(q => [q.id, q]));
    const ordered: Question[] = [];
    for (const qid of p.questionIds || []) {
      const q = qMap.get(qid) || allQuestions.find(aq => aq.id === qid);
      if (q) ordered.push(q);
    }
    setQuestions(ordered);

    // 初始化分值
    const scores: Record<string, number> = {};
    for (const q of ordered) {
      scores[q.id] = p.questionScores?.[q.id] || Math.floor(p.totalScore / Math.max(ordered.length, 1));
    }
    setQuestionScores(scores);
  }, [id]);

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const newQ = [...questions];
    [newQ[idx - 1], newQ[idx]] = [newQ[idx], newQ[idx - 1]];
    setQuestions(newQ);
  };

  const handleMoveDown = (idx: number) => {
    if (idx === questions.length - 1) return;
    const newQ = [...questions];
    [newQ[idx], newQ[idx + 1]] = [newQ[idx + 1], newQ[idx]];
    setQuestions(newQ);
  };

  const handleRemoveQuestion = (qid: string) => {
    setQuestions(questions.filter(q => q.id !== qid));
  };

  const handleScoreChange = (qid: string, score: number) => {
    setQuestionScores({ ...questionScores, [qid]: score });
  };

  const handleAutoScore = () => {
    if (questions.length === 0) return;
    const avg = Math.floor(totalScore / questions.length);
    const remainder = totalScore - avg * questions.length;
    const newScores: Record<string, number> = {};
    questions.forEach((q, i) => {
      newScores[q.id] = i === 0 ? avg + remainder : avg;
    });
    setQuestionScores(newScores);
    toast.success('已自动分配分值');
  };

  const handleSave = async () => {
    if (!paper) return;
    if (!title.trim()) {
      toast.error('请输入试卷标题');
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));

    const questionsInput: ExamPaperQuestionInput[] = questions.map(q => ({
      questionId: q.id,
      score: questionScores[q.id] || 0,
      sectionTitle: '',
    }));

    examPaperApi.update(paper.id, {
      title,
      description,
      totalScore,
      includeSolution: showAnswer,
      questions: questionsInput,
    });

    setSaving(false);
    toast.success('试卷保存成功！');
    navigate(`/exams/${paper.id}`);
  };

  if (!paper) {
    return <div className="p-8 text-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/exams/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回预览
          </Button>
          <h1 className="text-xl font-bold">编辑试卷</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/exams/${id}`)}>
            查看预览
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* 基本信息 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>试卷标题</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：三年级上册期中测试卷" />
          </div>
          <div>
            <Label>试卷描述</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="可选：试卷说明、注意事项等" rows={2} />
          </div>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>总分</Label>
              <Input type="number" value={totalScore} onChange={e => setTotalScore(Number(e.target.value))} min={1} max={1000} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">导出时含答案</Label>
              <Switch checked={showAnswer} onCheckedChange={setShowAnswer} />
            </div>
            <Button variant="outline" size="sm" onClick={handleAutoScore}>
              自动分配分值
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 题目列表（可排序、调整分值） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">题目列表（共 {questions.length} 题，共 {Object.values(questionScores).reduce((a, b) => a + b, 0)} 分）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <div key={q.id} className="flex items-start gap-2 p-3 border rounded hover:bg-gray-50">
                <div className="flex flex-col gap-1 mt-1">
                  <button onClick={() => handleMoveUp(idx)} className="text-gray-400 hover:text-blue-500 text-xs" title="上移">▲</button>
                  <button onClick={() => handleMoveDown(idx)} className="text-gray-400 hover:text-blue-500 text-xs" title="下移">▼</button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-600 min-w-[2em]">{idx + 1}.</span>
                    <span className="text-sm truncate">{q.contentText}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{q.questionType}</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-400">难度：{'★'.repeat(q.difficulty)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={questionScores[q.id] || 0}
                    onChange={e => handleScoreChange(q.id, Number(e.target.value))}
                    className="w-16 h-8 text-center"
                    min={0}
                  />
                  <span className="text-xs text-gray-400">分</span>
                  <button onClick={() => handleRemoveQuestion(q.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {questions.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                试卷中没有题目，请从题库中添加
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
