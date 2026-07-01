// 创建试卷页（含智能极速组卷）
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBasketStore } from '@/stores/basketStore';
import { examPaperApi, questionApi } from '@/lib/mockApi';
import { GRADES, SEMESTERS, TEXTBOOK_VERSIONS, QUESTION_TYPES } from '@/lib/constants';
import type { Question, Grade, Semester, TextbookVersion, QuestionType } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Trash2, GripVertical, Sparkles, RefreshCw, Lock, Unlock, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

export default function ExamPaperCreatePage() {
  const navigate = useNavigate();
  const basketItems = useBasketStore(s => s.items);
  const clearBasket = useBasketStore(s => s.clear);
  const currentUser = useAuthStore(s => s.user);
  const [saving, setSaving] = useState(false);

  // 试卷基本信息
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState('三年级');
  const [semester, setSemester] = useState('上册');
  const [textbookVersion, setTextbookVersion] = useState('人教版');
  const [totalScore, setTotalScore] = useState(100);

  // 模式切换：manual（手动）/ smart（智能组卷）
  const [mode, setMode] = useState<'manual' | 'smart'>('manual');

  // 手动组卷：题目排序
  const [sortedItems, setSortedItems] = useState(basketItems);
  useEffect(() => {
    setSortedItems(basketItems);
  }, [basketItems]);

  // ═══════════════════════════════════════════
  // 智能组卷状态
  // ═══════════════════════════════════════════
  const [smartConfig, setSmartConfig] = useState({
    knowledgePoints: [] as string[],
    questionTypes: [] as QuestionType[],
    difficultyDistribution: {
      '1-2星': 20,
      '3星': 60,
      '4-5星': 20,
    },
    totalCount: 10,
  });
  const [smartQuestions, setSmartQuestions] = useState<Question[]>([]);
  const [lockedQuestions, setLockedQuestions] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  // 智能组卷：生成试卷
  const handleSmartGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 500)); // 模拟延迟
      const result = examPaperApi.smartGenerate({
        grade: grade as Grade,
        semester: semester as Semester,
        textbookVersion: textbookVersion as TextbookVersion,
        knowledgePoints: smartConfig.knowledgePoints,
        questionTypes: smartConfig.questionTypes,
        difficultyDistribution: smartConfig.difficultyDistribution,
        totalCount: smartConfig.totalCount,
      });
      // 保留锁定的题目
      const locked = smartQuestions.filter(q => lockedQuestions.has(q.id));
      const newQuestions = result.questions.filter(q => !lockedQuestions.has(q.id));
      setSmartQuestions([...locked, ...newQuestions]);
      toast.success(`已生成 ${result.questions.length} 道题`);
    } catch (err) {
      toast.error('智能组卷失败');
    } finally {
      setIsGenerating(false);
    }
  }, [grade, semester, textbookVersion, smartConfig, smartQuestions, lockedQuestions]);

  // 智能组卷：锁定/解锁题目
  const toggleLock = (questionId: string) => {
    setLockedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // 智能组卷：移除题目
  const removeSmartQuestion = (questionId: string) => {
    setSmartQuestions(prev => prev.filter(q => q.id !== questionId));
    setLockedQuestions(prev => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  // 保存试卷（手动或智能）
  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('请输入试卷标题');
      return;
    }
    if (!currentUser) {
      toast.error('请先登录');
      return;
    }

    let questionsForSave: { questionId: string; score: number; sectionTitle: string }[] = [];

    if (mode === 'manual') {
      if (sortedItems.length === 0) {
        toast.error('试卷篮为空，请先添加题目');
        return;
      }
      questionsForSave = sortedItems.map(item => ({
        questionId: item.questionId,
        score: Math.floor(totalScore / sortedItems.length),
        sectionTitle: '',
      }));
    } else {
      if (smartQuestions.length === 0) {
        toast.error('请先智能生成试卷');
        return;
      }
      questionsForSave = smartQuestions.map(q => ({
        questionId: q.id,
        score: Math.floor(totalScore / smartQuestions.length),
        sectionTitle: '',
      }));
    }

    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const paper = examPaperApi.create(
        {
          title,
          description: '',
          grade: grade as Grade,
          semester: semester as Semester,
          textbookVersion: textbookVersion as TextbookVersion,
          totalScore,
          difficultyDistribution: {},
          includeSolution: false,
          questions: questionsForSave,
        },
        currentUser.id
      );
      clearBasket();
      toast.success('试卷创建成功！');
      navigate(`/exams/${paper.id}`);
    } catch (err) {
      console.error('保存试卷失败', err);
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 手动组卷：移动题目
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newItems = [...sortedItems];
    [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    setSortedItems(newItems);
  };
  const moveDown = (idx: number) => {
    if (idx === sortedItems.length - 1) return;
    const newItems = [...sortedItems];
    [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
    setSortedItems(newItems);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">创建试卷</h1>
      </div>

      {/* 试卷信息 */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div>
            <Label>试卷标题 *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：三年级上册期中测试卷" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>年级</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>学期</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SEMESTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>教材版本</Label>
              <Select value={textbookVersion} onValueChange={setTextbookVersion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TEXTBOOK_VERSIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>总分</Label>
            <Input type="number" value={totalScore} onChange={e => setTotalScore(Number(e.target.value))} className="w-24" />
          </div>
        </CardContent>
      </Card>

      {/* 模式切换 */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'}
          onClick={() => setMode('manual')}
        >
          手动组卷
        </Button>
        <Button
          variant={mode === 'smart' ? 'default' : 'outline'}
          onClick={() => setMode('smart')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          智能极速组卷
        </Button>
      </div>

      {/* 手动组卷模式 */}
      {mode === 'manual' && (
        <>
          {basketItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-400 mb-4">试卷篮为空，请先从题库添加题目</p>
                <Button onClick={() => navigate('/questions')}>去题库添加</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <h2 className="font-semibold mb-2">试卷题目（{sortedItems.length} 题）</h2>
              <div className="space-y-2 mb-4">
                {sortedItems.map((item, idx) => (
                  <Card key={item.questionId}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                      <span className="text-sm font-mono text-gray-400 w-6">{idx + 1}.</span>
                      <Badge variant="secondary" className="text-xs">{item.question.questionType}</Badge>
                      <span className="text-sm flex-1 line-clamp-1">{item.question.contentText}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => moveUp(idx)} disabled={idx === 0}><ArrowLeft className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => moveDown(idx)} disabled={idx === sortedItems.length - 1}><ArrowLeft className="w-3 h-3 rotate-180" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => useBasketStore.getState().remove(item.questionId)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* 智能组卷模式 */}
      {mode === 'smart' && (
        <>
          {/* 智能组卷配置 */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">⚡ 智能极速组卷</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 知识点 */}
              <div>
                <Label>知识点（可选）</Label>
                <Input
                  placeholder="输入知识点，用逗号分隔"
                  value={smartConfig.knowledgePoints.join(', ')}
                  onChange={e => setSmartConfig(prev => ({
                    ...prev,
                    knowledgePoints: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }))}
                />
              </div>

              {/* 题型 */}
              <div>
                <Label>题型（可选）</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {QUESTION_TYPES.map(qt => (
                    <Badge
                      key={qt}
                      variant={smartConfig.questionTypes.includes(qt) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        setSmartConfig(prev => {
                          const types = prev.questionTypes.includes(qt)
                            ? prev.questionTypes.filter(t => t !== qt)
                            : [...prev.questionTypes, qt];
                          return { ...prev, questionTypes: types };
                        });
                      }}
                    >
                      {qt}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 难度分布 */}
              <div>
                <Label>难度配比</Label>
                <div className="space-y-2 mt-1">
                  {Object.entries(smartConfig.difficultyDistribution).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-sm w-16">{key}</span>
                      <Input
                        type="number"
                        value={value}
                        onChange={e => setSmartConfig(prev => ({
                          ...prev,
                          difficultyDistribution: {
                            ...prev.difficultyDistribution,
                            [key]: Number(e.target.value)
                          }
                        }))}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 题量 */}
              <div>
                <Label>题量</Label>
                <Input
                  type="number"
                  value={smartConfig.totalCount}
                  onChange={e => setSmartConfig(prev => ({ ...prev, totalCount: Number(e.target.value) }))}
                  className="w-24"
                />
              </div>

              {/* 生成按钮 */}
              <Button onClick={handleSmartGenerate} disabled={isGenerating} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? '生成中...' : '🤖 智能生成'}
              </Button>
            </CardContent>
          </Card>

          {/* 智能组卷结果 */}
          {smartQuestions.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">组卷结果（{smartQuestions.length} 题）</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSmartGenerate}
                  disabled={isGenerating}
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  换一批
                </Button>
              </div>
              <div className="space-y-2 mb-4">
                {smartQuestions.map((question, idx) => (
                  <Card key={question.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <span className="text-sm font-mono text-gray-400 w-6">{idx + 1}.</span>
                      <Badge variant="secondary" className="text-xs">{question.questionType}</Badge>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={i < question.difficulty ? 'text-yellow-500' : 'text-gray-300'}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm flex-1 line-clamp-1">{question.contentText}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLock(question.id)}
                          title={lockedQuestions.has(question.id) ? '解锁' : '锁定'}
                        >
                          {lockedQuestions.has(question.id) ? (
                            <Lock className="w-4 h-4 text-green-600" />
                          ) : (
                            <Unlock className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => removeSmartQuestion(question.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* 保存按钮 */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? '保存中...' : '保存试卷'}
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>取消</Button>
      </div>
    </div>
  );
}
