// 新建题目页（完整功能版）
import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { questionApi } from '@/lib/mockApi';
import {
  GRADES, SEMESTERS, TEXTBOOK_VERSIONS, QUESTION_TYPES,
  DIFFICULTY_LABELS, TEXTBOOK_UNITS, SEMESTER_KNOWLEDGE_POINTS, getKPsByUnit
} from '@/lib/constants';
import type { Grade, Semester, TextbookVersion } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, X, BookOpen, Trash2, Sparkles, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

/** 将图片文件压缩为 WebP 格式的 base64 */
function compressImageToWebP(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
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
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
}

export default function QuestionCreatePage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const [kpInput, setKpInput] = useState('');
  const [choiceOptions, setChoiceOptions] = useState<
    { id: string; label: string; text: string }[]
  >([]);

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  // 当题型切换时，如果是选择题则初始化选项
  const handleQuestionTypeChange = (type: string) => {
    update('questionType', type);
    if (type === '选择题' && choiceOptions.length === 0) {
      // 初始化A/B/C/D四个选项
      setChoiceOptions([
        { id: '1', label: 'A', text: '' },
        { id: '2', label: 'B', text: '' },
        { id: '3', label: 'C', text: '' },
        { id: '4', label: 'D', text: '' },
      ]);
    }
  };

  // 添加选择题选项
  const addChoiceOption = () => {
    const nextLabel = String.fromCharCode(65 + choiceOptions.length);
    if (nextLabel > 'Z') return;
    setChoiceOptions(prev => [
      ...prev,
      { id: Date.now().toString(), label: nextLabel, text: '' },
    ]);
  };

  // 更新选项
  const updateChoiceOption = (id: string, text: string) => {
    setChoiceOptions(prev => prev.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  // 删除选项
  const removeChoiceOption = (id: string) => {
    if (choiceOptions.length <= 2) {
      toast.error('选择题至少需要2个选项');
      return;
    }
    setChoiceOptions(prev => prev.filter(opt => opt.id !== id));
  };

  // 根据年级+学期+版本动态获取章节列表
  const unitOptions = useMemo(() => {
    try {
      const key = `${form.grade}-${form.semester}-${form.textbookVersion}`;
      return TEXTBOOK_UNITS[key] || [];
    } catch (error) {
      console.error('获取章节列表失败:', error);
      return [];
    }
  }, [form.grade, form.semester, form.textbookVersion]);

  // 智能推荐知识点
  const recommendedKPs = useMemo(() => {
    try {
      if (form.unit) {
        const kps = getKPsByUnit(form.grade, form.semester, form.unit);
        if (kps && kps.length > 0) {
          return kps;
        }
      }
      const semKey = `${form.grade}-${form.semester}`;
      return SEMESTER_KNOWLEDGE_POINTS[semKey] || [];
    } catch (error) {
      console.error('推荐知识点失败:', error);
      return [];
    }
  }, [form.grade, form.semester, form.unit]);

  // 过滤掉已选中的知识点
  const availableRecommendedKPs = useMemo(
    () => recommendedKPs.filter(kp => !form.knowledgePoints.includes(kp)),
    [recommendedKPs, form.knowledgePoints]
  );

  // 快速添加推荐知识点
  const quickAddKp = (kp: string) => {
    if (!form.knowledgePoints.includes(kp)) {
      update('knowledgePoints', [...form.knowledgePoints, kp]);
    }
  };

  // 图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        if (files[i].size > 5 * 1024 * 1024) {
          toast.error(`图片「${files[i].name}」超过5MB限制`);
          continue;
        }
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

  // 提交
  const handleSubmit = async () => {
    // 必填项验证
    if (!form.contentText.trim() && form.contentImages.length === 0) {
      toast.error('请输入题目内容或上传图片');
      return;
    }
    if (!form.answer.trim()) {
      toast.error('请输入答案');
      return;
    }
    if (!form.unit) {
      toast.error('请选择教材章节');
      return;
    }
    if (!user) {
      toast.error('请先登录');
      return;
    }

    setSaving(true);
    try {
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

      // 选择题：保存选项
      if (form.questionType === '选择题' && choiceOptions.length > 0) {
        data.choiceOptions = choiceOptions;
      }

      await questionApi.create(data, user.id);
      toast.success('题目创建成功');
      navigate('/questions');
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <h1 className="text-2xl font-bold">新建题目</h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {/* 基本信息 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="required-field">年级</Label>
              <Select value={form.grade} onValueChange={v => update('grade', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="required-field">学期</Label>
              <Select value={form.semester} onValueChange={v => update('semester', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="required-field">教材版本</Label>
              <Select value={form.textbookVersion} onValueChange={v => update('textbookVersion', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEXTBOOK_VERSIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 题型 + 章节 + 难度 */}
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
                <BookOpen className="w-3.5 h-3.5" /> 教材章节
              </Label>
              <Select
                value={form.unit}
                onValueChange={v => update('unit', v)}
                disabled={unitOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    unitOptions.length === 0 ? '请先选年级和版本' : '选择所属单元'
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
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => update('difficulty', d)}
                    className={`px-2 py-1 rounded text-xs ${
                      form.difficulty === d ? 'bg-yellow-400 text-white' : 'bg-gray-100'
                    }`}
                  >
                    {'★'.repeat(d)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 知识点推荐 */}
          {availableRecommendedKPs.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-blue-700">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  智能推荐知识点
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newOnes = availableRecommendedKPs;
                    if (newOnes.length === 0) return;
                    update('knowledgePoints', [...form.knowledgePoints, ...newOnes]);
                    toast.success(`已添加 ${newOnes.length} 个推荐知识点`);
                  }}
                >
                  一键添加全部
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableRecommendedKPs.map(kp => (
                  <button
                    type="button"
                    key={kp}
                    onClick={() => quickAddKp(kp)}
                    className="text-xs px-2 py-1 rounded-full border border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
                  >
                    + {kp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 已选知识点 */}
          {form.knowledgePoints.length > 0 && (
            <div>
              <Label>已选知识点</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {form.knowledgePoints.map(kp => (
                  <Badge key={kp} variant="secondary" className="cursor-pointer" onClick={() => {
                    update('knowledgePoints', form.knowledgePoints.filter(k => k !== kp));
                  }}>
                    {kp} <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 题目内容 */}
          <div>
            <Label>题目内容 *</Label>
            <Textarea
              value={form.contentText}
              onChange={e => update('contentText', e.target.value)}
              placeholder="输入题目内容..."
              rows={4}
            />
          </div>

          {/* 图片上传 */}
          <div>
            <Label>题目图片（可选）</Label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              className="mt-1"
            >
              <ImagePlus className="w-4 h-4 mr-2" />
              上传图片（自动压缩为WebP）
            </Button>
            {form.contentImages.length > 0 && (
              <div className="mt-2 space-y-2">
                {form.contentImages.map((img, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <img src={img} alt={`题目图片${i + 1}`} className="w-20 h-20 object-cover rounded" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage(i)}
                      className="text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 选择题选项 */}
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
                {choiceOptions.map((opt) => (
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChoiceOption(opt.id)}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 答案 */}
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

          {/* 思路点拨 + 详细解析 */}
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
              {saving ? '保存中...' : '保存题目'}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>取消</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
