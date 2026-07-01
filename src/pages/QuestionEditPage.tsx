// 编辑题目页（复用 QuestionCreatePage 的表单逻辑）
import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { questionApi } from '@/lib/mockApi';
import {
  GRADES, SEMESTERS, TEXTBOOK_VERSIONS, QUESTION_TYPES,
  DIFFICULTY_LABELS, TEXTBOOK_UNITS, SEMESTER_KNOWLEDGE_POINTS, getKPsByUnit
} from '@/lib/constants';
import type { Grade, Semester, TextbookVersion, Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, X, ImagePlus, Trash2, Sparkles, Save, Trash } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/** 将图片文件压缩为 WebP 格式的 base64 */
function compressImageToWebP(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 缩放
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // 转换为WebP
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(webpDataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function QuestionEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState<Question | null>(null);

  // 表单状态（与 QuestionCreatePage 一致）
  const [form, setForm] = useState({
    contentType: 'text' as 'text' | 'image' | 'text+image',
    contentText: '',
    contentImages: [] as string[],
    answer: '',
    solutionHint: '',
    solutionDetail: '',
    grade: '三年级' as string,
    semester: '上册' as string,
    textbookVersion: '人教版' as string,
    unit: '' as string,
    knowledgePoints: [] as string[],
    questionType: '填空题' as string,
    difficulty: 3 as 1 | 2 | 3 | 4 | 5,
    isFrequentMistake: false,
    source: '',
  });

  // 选择题选项
  const [choiceOptions, setChoiceOptions] = useState<
    { id: string; label: string; text: string }[]
  >([]);

  const [kpInput, setKpInput] = useState('');

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  // 加载题目数据
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const q = await questionApi.getById(id);
        if (!q) {
          toast.error('题目不存在');
          navigate('/questions');
          return;
        }
        setQuestion(q);
        // 填充表单
        setForm({
          contentType: q.contentType,
          contentText: q.contentText,
          contentImages: q.contentImages || [],
          answer: q.answer,
          solutionHint: q.solutionHint || '',
          solutionDetail: q.solutionDetail || '',
          grade: q.grade,
          semester: q.semester,
          textbookVersion: q.textbookVersion,
          unit: q.unit || '',
          knowledgePoints: q.knowledgePoints,
          questionType: q.questionType,
          difficulty: q.difficulty,
          isFrequentMistake: q.isFrequentMistake || false,
          source: q.source || '',
        });
        // 如果是选择题，解析选项
        if (q.questionType === '选择题' && q.choiceOptions) {
          setChoiceOptions(
            (q.choiceOptions as string[]).map((text: string, i: number) => ({
              id: `opt-${i}`,
              label: String.fromCharCode(65 + i),
              text,
            }))
          );
        }
      } catch (e) {
        toast.error('加载题目失败');
      }
    })();
  }, [id]);

  // 根据年级+学期+版本动态获取章节列表
  const unitOptions = useMemo(() => {
    const key = `${form.grade}-${form.semester}-${form.textbookVersion}`;
    return TEXTBOOK_UNITS[key] || [];
  }, [form.grade, form.semester, form.textbookVersion]);

  // 当年级/学期/版本变化时，清空章节选择
  const handleGradeOrVersionChange = () => {
    update('unit', '');
  };

  // ── 智能推荐知识点 ──
  const recommendedKPs = useMemo(() => {
    if (form.unit) {
      const kps = getKPsByUnit(form.grade, form.semester, form.unit);
      if (kps && kps.length > 0) {
        return kps;
      }
    }
    const semKey = `${form.grade}-${form.semester}`;
    return SEMESTER_KNOWLEDGE_POINTS[semKey] || [];
  }, [form.grade, form.semester, form.unit]);

  const availableRecommendedKPs = useMemo(
    () => recommendedKPs.filter(kp => !form.knowledgePoints.includes(kp)),
    [recommendedKPs, form.knowledgePoints]
  );

  const quickAddKp = (kp: string) => {
    if (!form.knowledgePoints.includes(kp)) {
      update('knowledgePoints', [...form.knowledgePoints, kp]);
    }
  };

  const addAllRecommended = () => {
    const newOnes = availableRecommendedKPs;
    if (newOnes.length === 0) {
      toast.info('推荐的知识点已全部添加');
      return;
    }
    update('knowledgePoints', [...form.knowledgePoints, ...newOnes]);
    toast.success(`已添加 ${newOnes.length} 个推荐知识点`);
  };

  // ── 图片上传 ──
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        // 检查文件大小（限制5MB）
        if (files[i].size > 5 * 1024 * 1024) {
          toast.error(`图片「${files[i].name}」超过5MB限制`);
          continue;
        }
        // 压缩为WebP
        const webpBase64 = await compressImageToWebP(files[i]);
        newImages.push(webpBase64);
      } catch {
        toast.error(`图片「${files[i].name}」处理失败`);
      }
    }
    if (newImages.length > 0) {
      const updated = [...form.contentImages, ...newImages];
      update('contentImages', updated);
      if (form.contentText.trim()) {
        update('contentType', 'text+image');
      } else {
        update('contentType', 'image');
      }
      toast.success(`已添加 ${newImages.length} 张图片（已压缩为WebP）`);
    }
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const updated = form.contentImages.filter((_, i) => i !== index);
    update('contentImages', updated);
    if (updated.length === 0) {
      update('contentType', form.contentText.trim() ? 'text' : 'text');
    } else if (!form.contentText.trim()) {
      update('contentType', 'image');
    } else {
      update('contentType', 'text+image');
    }
  };

  // ── 选择题选项管理 ──
  const addChoiceOption = () => {
    const nextLabel = String.fromCharCode(65 + choiceOptions.length);
    if (nextLabel > 'Z') return;
    setChoiceOptions(prev => [
      ...prev,
      { id: Date.now().toString(), label: nextLabel, text: '' },
    ]);
  };

  const updateChoiceOption = (id: string, text: string) => {
    setChoiceOptions(prev =>
      prev.map(opt => (opt.id === id ? { ...opt, text } : opt))
    );
  };

  const removeChoiceOption = (id: string) => {
    setChoiceOptions(prev => {
      const filtered = prev.filter(opt => opt.id !== id);
      return filtered.map((opt, i) => ({ ...opt, label: String.fromCharCode(65 + i) }));
    });
  };

  const handleQuestionTypeChange = (v: string) => {
    update('questionType', v);
    if (v !== '选择题') {
      setChoiceOptions([]);
    }
  };

  const addKnowledgePoint = () => {
    const kp = kpInput.trim();
    if (kp && !form.knowledgePoints.includes(kp)) {
      update('knowledgePoints', [...form.knowledgePoints, kp]);
      setKpInput('');
    }
  };

  const removeKp = (kp: string) => {
    update('knowledgePoints', form.knowledgePoints.filter(k => k !== kp));
  };

  const handleSubmit = async () => {
    if (!id) return;
    if (!form.contentText.trim() && form.contentImages.length === 0) {
      toast.error('请输入题目内容或上传题目图片');
      return;
    }
    if (form.questionType === '选择题' && choiceOptions.length < 2) {
      toast.error('选择题至少需要 2 个选项');
      return;
    }
    if (form.knowledgePoints.length === 0) {
      toast.error('请至少添加一个知识点');
      return;
    }

    // 构建答案：选择题时把选项文本也合并进去
    let finalAnswer = form.answer;
    if (form.questionType === '选择题' && choiceOptions.length > 0) {
      const optionsText = choiceOptions
        .map(opt => `${opt.label}. ${opt.text}`)
        .join('\n');
      finalAnswer = optionsText + (form.answer ? `\n答案：${form.answer}` : '');
    }

    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    try {
      await questionApi.update(id, {
        contentType: form.contentType,
        contentText: form.contentText,
        contentImages: form.contentImages,
        answer: finalAnswer,
        solutionHint: form.solutionHint,
        solutionDetail: form.solutionDetail,
        grade: form.grade as Grade,
        semester: form.semester as Semester,
        textbookVersion: form.textbookVersion as TextbookVersion,
        unit: form.unit,
        knowledgePoints: form.knowledgePoints,
        questionType: form.questionType as '填空题',
        difficulty: form.difficulty,
        isFrequentMistake: form.isFrequentMistake,
        source: form.source,
      });
      setSaving(false);
      toast.success('题目更新成功！');
      navigate('/questions');
    } catch (error: any) {
      setSaving(false);
      toast.error(error.message || '更新失败');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    await new Promise(r => setTimeout(r, 300));
    try {
      const result = await questionApi.delete(id);
      setDeleting(false);
      setShowDeleteDialog(false);
      if (result.success) {
        toast.success('题目已删除');
        navigate('/questions');
      } else {
        toast.error(result.message || '删除失败');
      }
    } catch (error: any) {
      setDeleting(false);
      setShowDeleteDialog(false);
      toast.error(error.message || '删除失败');
    }
  };

  if (!question) {
    return <div className="p-8 text-center text-gray-400">加载中...</div>;
  }

  // 权限检查
  const isAdmin = user?.role === 'admin';
  const isOwner = user?.id === question.creatorId;
  const canEditHere = isAdmin || (isOwner && (question.status === 'pending' || question.status === 'rejected'));

  if (!canEditHere) {
    return (
      <div className="p-8 text-center text-gray-400">
        {isOwner ? '该题目已审核通过，不能修改' : '您无权编辑此题目'}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">编辑题目</h1>
        </div>
        {/* 删除按钮 */}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash className="w-4 h-4 mr-1" /> 删除题目
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">

          {/* ── 题目文字内容 ── */}
          <div>
            <Label>题目内容 {form.contentImages.length === 0 && '*'}</Label>
            <Textarea
              value={form.contentText}
              onChange={e => {
                update('contentText', e.target.value);
                if (e.target.value.trim() && form.contentImages.length > 0) {
                  update('contentType', 'text+image');
                } else if (e.target.value.trim()) {
                  update('contentType', 'text');
                } else if (form.contentImages.length > 0) {
                  update('contentType', 'image');
                }
              }}
              placeholder="输入题目内容，支持多行..."
              rows={4}
            />
          </div>

          {/* ── 图片上传区域 ── */}
          <div>
            <Label className="flex items-center gap-1">
              <ImagePlus className="w-3.5 h-3.5" /> 题目图片（可选，支持多张）
            </Label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <div className="flex gap-2 mt-1 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImagePlus className="w-4 h-4 mr-1" /> 上传图片
              </Button>
              {form.contentImages.length > 0 && (
                <span className="text-xs text-gray-400 self-center">
                  已上传 {form.contentImages.length} 张图片
                </span>
              )}
            </div>
            {form.contentImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {form.contentImages.map((img, i) => (
                  <div key={i} className="relative group border rounded overflow-hidden">
                    <img
                      src={img}
                      alt={`题目图片 ${i + 1}`}
                      className="w-full h-28 object-contain bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 hover:opacity-100"
                      title="删除图片"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center h-28 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  <ImagePlus className="w-6 h-6 mb-1" />
                  <span className="text-xs">添加图片</span>
                </button>
              </div>
            )}
          </div>

          {/* 年级 / 学期 / 版本 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="required-field">年级</Label>
              <Select value={form.grade} onValueChange={v => { update('grade', v); handleGradeOrVersionChange(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="required-field">学期</Label>
              <Select value={form.semester} onValueChange={v => { update('semester', v); handleGradeOrVersionChange(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="required-field">教材版本</Label>
              <Select value={form.textbookVersion} onValueChange={v => { update('textbookVersion', v); handleGradeOrVersionChange(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEXTBOOK_VERSIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 题型 + 章节单元 + 难度 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="required-field">题型</Label>
              <Select value={form.questionType} onValueChange={handleQuestionTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="required-field flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 教材章节
              </Label>
              <Select
                value={form.unit}
                onValueChange={v => update('unit', v)}
                disabled={unitOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    unitOptions.length === 0
                      ? '请先选年级和版本'
                      : '选择所属单元'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="required-field">难度</Label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {[1, 2, 3, 4, 5].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => update('difficulty', d)}
                    className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                      form.difficulty === d
                        ? 'bg-yellow-400 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={DIFFICULTY_LABELS[d]}
                  >
                    {'★'.repeat(d)}{'☆'.repeat(5 - d)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1 leading-tight">{DIFFICULTY_LABELS[form.difficulty]}</p>
            </div>
          </div>

          {/* ── 选择题选项（仅选择题时显示） ── */}
          {form.questionType === '选择题' && (
            <div className="border rounded-lg p-4 bg-blue-50/50">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold text-blue-700">选择题选项</Label>
                <Button type="button" variant="outline" size="sm" onClick={addChoiceOption}>
                  <Plus className="w-4 h-4 mr-1" /> 添加选项
                </Button>
              </div>
              {choiceOptions.length === 0 && (
                <p className="text-sm text-gray-400 mb-2">尚未添加选项，点击「添加选项」开始。</p>
              )}
              <div className="space-y-2">
                {choiceOptions.map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {opt.label}
                    </span>
                    <Input
                      value={opt.text}
                      onChange={e => updateChoiceOption(opt.id, e.target.value)}
                      placeholder={`请输入选项 ${opt.label} 的内容`}
                      className="flex-1"
                    />
                    {choiceOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChoiceOption(opt.id)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {choiceOptions.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  提示：答案请填写选项字母（如 A、B、C），保存时会自动将选项内容合并到答案中。
                </p>
              )}
            </div>
          )}

          {/* ── 知识点（智能推荐 + 手动添加） ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500" /> 知识点（可多个）*
              </Label>
              {availableRecommendedKPs.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAllRecommended}
                  className="h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" /> 一键添加全部
                </Button>
              )}
            </div>

            {recommendedKPs.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-1.5 mb-2 text-xs text-blue-700">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="font-medium">
                    {form.unit
                      ? `根据「${form.unit}」推荐的知识点`
                      : `${form.grade}${form.semester}通用知识点`}
                  </span>
                  <span className="text-gray-400 ml-1">（点击即可添加）</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedKPs.map(kp => {
                    const added = form.knowledgePoints.includes(kp);
                    return (
                      <button
                        type="button"
                        key={kp}
                        onClick={() => !added && quickAddKp(kp)}
                        disabled={added}
                        className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                          added
                            ? 'bg-green-100 text-green-700 border-green-300 cursor-not-allowed opacity-60'
                            : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100 cursor-pointer'
                        }`}
                      >
                        {added ? '✓ ' : '+ '}
                        {kp}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-2">
              <Input
                value={kpInput}
                onChange={e => setKpInput(e.target.value)}
                placeholder="输入自定义知识点，回车添加"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKnowledgePoint())}
              />
              <Button type="button" variant="outline" onClick={addKnowledgePoint}><Plus className="w-4 h-4" /></Button>
            </div>

            {form.knowledgePoints.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.knowledgePoints.map(kp => (
                  <Badge key={kp} variant="secondary" className="cursor-pointer" onClick={() => removeKp(kp)}>
                    {kp} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
            {form.knowledgePoints.length === 0 && (
              <p className="text-xs text-gray-400">尚未添加知识点，请从上方推荐区点击，或手动输入。</p>
            )}
          </div>

          {/* 答案 + 思路点拨 + 解析 */}
          <div>
            <Label>答案 {form.questionType !== '选择题' && '*'}</Label>
            {form.questionType === '选择题' ? (
              <Input
                value={form.answer}
                onChange={e => update('answer', e.target.value)}
                placeholder="填写正确答案的字母（如：A 或 B 或 C）"
                className="mt-1"
              />
            ) : (
              <Textarea value={form.answer} onChange={e => update('answer', e.target.value)} placeholder="输入答案" rows={2} />
            )}
          </div>
          <div>
            <Label>思路点拨（教师用，选填）</Label>
            <Textarea value={form.solutionHint} onChange={e => update('solutionHint', e.target.value)} placeholder="解题思路提示" rows={2} />
          </div>
          <div>
            <Label>详细解析（选填）</Label>
            <Textarea value={form.solutionDetail} onChange={e => update('solutionDetail', e.target.value)} placeholder="详细解题步骤" rows={3} />
          </div>

          {/* 高频易错 + 来源 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={form.isFrequentMistake} onCheckedChange={v => update('isFrequentMistake', v)} />
              <Label>标记为高频易错</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>来源</Label>
              <Input value={form.source} onChange={e => update('source', e.target.value)} placeholder="如：2024期末" className="w-40" />
            </div>
          </div>

          {/* 提交 */}
          <div className="flex gap-3 pt-3">
            <Button onClick={handleSubmit} disabled={saving} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : '保存修改'}
            </Button>
            {/* 已驳回的题目：显示"保存并重新提交"按钮 */}
            {question?.status === 'rejected' && (
              <Button
                onClick={async () => {
                  if (!id) return;
                  setSaving(true);
                  try {
                    // 先保存修改
                    const data: any = {
                      contentType: form.contentType,
                      contentText: form.contentText,
                      contentImages: form.contentImages,
                      answer: form.answer,
                      solutionHint: form.solutionHint,
                      solutionDetail: form.solutionDetail,
                      grade: form.grade,
                      semester: form.semester,
                      textbookVersion: form.textbookVersion,
                      unit: form.unit,
                      knowledgePoints: form.knowledgePoints,
                      questionType: form.questionType,
                      difficulty: form.difficulty,
                      isFrequentMistake: form.isFrequentMistake,
                      source: form.source,
                    };
                    if (form.questionType === '选择题' && choiceOptions.length > 0) {
                      data.choiceOptions = choiceOptions;
                    }
                    await questionApi.update(id, data);
                    // 重新提交（状态改回 pending）
                    await questionApi.resubmit(id);
                    toast.success('已保存并重新提交，等待管理员审核');
                    navigate('/my-space');
                  } catch (error: any) {
                    toast.error(error.message || '操作失败');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? '提交中...' : '保存并重新提交'}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(-1)}>取消</Button>
          </div>
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这道题目吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleting}
            >
              {deleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
