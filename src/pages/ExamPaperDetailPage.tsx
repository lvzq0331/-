// 试卷详情页 — 预览题目、导出、实时页面设置
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { examPaperApi, questionApi } from '@/lib/mockApi';
import type { ExamPaper, Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileEdit, Printer, FileDown, Settings, ChevronRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { exportExamPaperToWord } from '@/lib/exportToWord';

function loadSettings(paperId: string): PaperSettings {
  try {
    const raw = localStorage.getItem(`mqb_paper_settings_${paperId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    paperSize: 'a4',
    fontSize: 'medium',
    lineSpacing: 'normal',
    showAnswer: false,
    showScore: true,
    showKnowledgePoints: false,
  };
}

function saveSettings(paperId: string, settings: PaperSettings) {
  localStorage.setItem(`mqb_paper_settings_${paperId}`, JSON.stringify(settings));
}

interface PaperSettings {
  paperSize: 'a4' | 'a3';
  fontSize: 'small' | 'medium' | 'large';
  lineSpacing: 'compact' | 'normal' | 'loose';
  showAnswer: boolean;
  showScore: boolean;
  showKnowledgePoints: boolean;
}

const FONT_SIZE_MAP = { small: '12px', medium: '14px', large: '16px' } as const;
const FONT_SIZE_LABEL = { small: '小', medium: '中', large: '大' } as const;
const LINE_SPACING_MAP = { compact: '1.2', normal: '1.6', loose: '2.0' } as const;
const LINE_SPACING_LABEL = { compact: '紧凑', normal: '正常', loose: '宽松' } as const;

export default function ExamPaperDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exporting, setExporting] = useState<'word' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<PaperSettings>(() => ({
    paperSize: 'a4',
    fontSize: 'medium',
    lineSpacing: 'normal',
    showAnswer: false,
    showScore: true,
    showKnowledgePoints: false,
  }));

  useEffect(() => {
    if (!id) return;
    
    try {
      console.log('正在加载试卷，ID:', id);
      const p = examPaperApi.getById(id);
      console.log('试卷数据:', p);
      
      if (!p) { 
        toast.error('试卷不存在'); 
        navigate('/exams'); 
        return; 
      }
      
      setPaper(p);
      const savedSettings = loadSettings(id);
      setSettings({ ...savedSettings, showAnswer: savedSettings.showAnswer || p.includeSolution || false });
      
      console.log('正在加载题目数据...');
      // 修复：questionApi.list() 返回 { data: Question[]; total: number }
      // 需要兼容两种调用方式：无参数返回 Question[]，有参数返回 { data, total }
      let allQuestions: Question[] = [];
      try {
        const result = questionApi.list({ status: 'published' });
        allQuestions = result.data || [];
      } catch (error) {
        console.warn('使用新API失败，尝试旧API:', error);
        // 降级：直接调用无参数版本
        allQuestions = questionApi.list();
      }
      
      console.log('题目列表数量:', allQuestions.length);
      const qMap = new Map(allQuestions.map(q => [q.id, q]));
      const ordered: Question[] = [];
      
      console.log('试卷题目IDs:', p.questionIds);
      for (const qid of p.questionIds || []) {
        const q = qMap.get(qid) || allQuestions.find(aq => aq.id === qid);
        if (q) {
          ordered.push(q);
          console.log('已加载题目:', q.id, q.contentText?.substring(0, 20));
        } else {
          console.warn('题目未找到:', qid);
        }
      }
      
      console.log('最终加载的题目数量:', ordered.length);
      setQuestions(ordered);
    } catch (error) {
      console.error('加载试卷失败:', error);
      toast.error('加载试卷失败');
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) saveSettings(id, settings); }, [settings, id]);

  const handleSettingChange = (key: keyof PaperSettings, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleExportWord = async () => {
    if (!paper) return;
    setExporting('word');
    try {
      await exportExamPaperToWord(paper, questions, settings.showAnswer, settings.paperSize);
      toast.success('Word 导出成功！');
    } catch (err) {
      console.error(err);
      toast.error('Word 导出失败');
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">加载中...</div>;
  if (!paper) return <div className="p-8 text-center text-gray-400">试卷不存在</div>;

  const totalQuestions = questions.length;
  const previewWidth = settings.paperSize === 'a4' ? '210mm' : '420mm';
  const previewHeight = '297mm';
  const previewMaxWidth = settings.paperSize === 'a4' ? '794px' : '1123px';
  const fontSizePx = FONT_SIZE_MAP[settings.fontSize];
  const lineHeight = LINE_SPACING_MAP[settings.lineSpacing];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 主内容区 */}
      <div className="flex-1 p-4 md:p-6 overflow-auto" style={{
        marginRight: settingsOpen ? (settings.paperSize === 'a3' ? '340px' : '320px') : '0',
        transition: 'margin-right 0.3s',
      }}>
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/exams')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> 返回
            </Button>
            <h1 className="text-xl font-bold">{paper.title}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(!settingsOpen)} className={settingsOpen ? 'bg-blue-50' : ''}>
              <Settings className="w-4 h-4 mr-1" /> {settingsOpen ? '隐藏设置' : '页面设置'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> 打印
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportWord} disabled={exporting !== null}>
              <FileDown className="w-4 h-4 mr-1" /> 导出Word
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => navigate(`/exams/${id}/edit`)}>
                <FileEdit className="w-4 h-4 mr-1" /> 编辑试卷
              </Button>
            )}
          </div>
        </div>

        {/* 试卷预览区域（模拟纸张） */}
        <div
          id="exam-paper-content"
          className="mx-auto bg-white shadow-lg relative"
          style={{
            width: previewWidth,
            maxWidth: previewMaxWidth,
            minHeight: previewHeight,
            padding: settings.paperSize === 'a4' ? '18mm 16mm' : '15mm 20mm',
            fontSize: fontSizePx,
            lineHeight,
            fontFamily: "'SimSun', 'STSong', 'Songti SC', serif",
            transition: 'width 0.3s, font-size 0.2s',
          }}
        >
          {/* 学校名 */}
          <div className="text-center" style={{ marginBottom: '2px' }}>
            <span style={{ fontSize: `calc(${fontSizePx} * 0.9)`, letterSpacing: '2px' }}>
              （学校）
            </span>
          </div>

          {/* 试卷标题（加粗大字） */}
          <h1
            className="text-center font-bold"
            style={{
              fontSize: `calc(${fontSizePx} * ${settings.paperSize === 'a3' ? '1.5' : '1.7'})`,
              marginBottom: '2px',
              letterSpacing: '1px',
            }}
          >
            {paper.title}
          </h1>

          {/* 信息行：命题人 / 满分 / 考试时间 */}
          <div
            className="text-center"
            style={{
              fontSize: `calc(${fontSizePx} * 0.75)`,
              color: '#333',
              marginBottom: '4px',
            }}
          >
            命题人：__________&nbsp;&nbsp;&nbsp;满分：<strong>{paper.totalScore}</strong> 分&nbsp;&nbsp;&nbsp;考试时间：120 分钟
          </div>

          {/* 考生信息（居中） */}
          <div className="text-center mb-3" style={{ fontSize: `calc(${fontSizePx} * 0.85)`, color: '#333' }}>
            姓名：____________ 班级：____________ 学号：____________ 得分：____________
          </div>

          {/* 题目列表（单栏） */}
          <div className="space-y-2">
            {questions.map((q, idx) => {
              const score = settings.showScore
                ? (paper.questionScores?.[q.id] || Math.floor(paper.totalScore / Math.max(totalQuestions, 1)))
                : 0;
              return (
                <div key={q.id} style={{ pageBreakInside: 'avoid', marginBottom: '8px' }}>
                  {/* 题号 + 分值 + 内容 */}
                  <div>
                    <span className="font-bold">
                      {idx + 1}.
                      {settings.showScore && score > 0 && (
                        <span className="font-normal text-gray-500 ml-1" style={{ fontSize: `calc(${fontSizePx} * 0.82)` }}>
                          （{score}分）
                        </span>
                      )}
                    </span>{' '}
                    <span style={{ whiteSpace: 'pre-wrap' }}>{q.contentText}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => navigate(`/questions/${q.id}/edit`)}
                        className="inline-block align-middle ml-1 text-gray-300 hover:text-blue-500 transition-colors"
                        title="编辑此题"
                      ><Pencil className="w-3 h-3" /></button>
                    )}
                  </div>

                  {/* 选择题选项 */}
                  {q.questionType === '选择题' && q.choiceOptions && q.choiceOptions.length > 0 && (
                    <div className="ml-5 mt-1" style={{ fontSize: `calc(${fontSizePx} * 0.94)`, lineHeight: 1.5 }}>
                      {q.choiceOptions.map((opt: string, oi: number) => (
                        <div key={oi}><span className="mr-1">{String.fromCharCode(65 + oi)}.</span>{opt}</div>
                      ))}
                    </div>
                  )}

                  {/* 知识点 */}
                  {settings.showKnowledgePoints && q.knowledgePoints.length > 0 && (
                    <div className="mt-1" style={{ fontSize: `calc(${fontSizePx} * 0.7)` }}>
                      {q.knowledgePoints.map(kp => (
                        <span key={kp} className="inline-block bg-gray-100 text-gray-500 rounded px-1 mr-1">{kp}</span>
                      ))}
                    </div>
                  )}

                  {/* 答案 */}
                  {settings.showAnswer && (
                    <div className="mt-1 p-1.5 bg-green-50 rounded border border-green-200" style={{ fontSize: `calc(${fontSizePx} * 0.85)` }}>
                        <span className="font-bold text-green-700">答：{q.answer}</span>
                        {q.solutionDetail && <span className="text-blue-600 ml-2">解析：{q.solutionDetail}</span>}
                    </div>
                  )}

                  {/* 解答题空白 */}
                  {(q.questionType === '解决问题' || q.questionType === '应用题') && !settings.showAnswer && (
                    <div className="mt-1" style={{ height: '48px' }} />
                  )}
                </div>
              );
            })}
            {questions.length === 0 && (
              <div className="text-center py-12 text-gray-400">试卷中没有题目</div>
            )}
          </div>

          {/* 页脚：第 X 页，共 Y 页 */}
          <div
            className="text-center mt-6"
            style={{
              fontSize: `calc(${fontSizePx} * 0.65)`,
              color: '#999',
            }}
          >
            第 1 页，共 1 页
          </div>
        </div>
      </div>

      {/* 右侧设置面板（抽屉） */}
      <div
        className="fixed top-0 right-0 h-full bg-white shadow-xl border-l z-40 flex transition-transform duration-300"
        style={{
          width: settings.paperSize === 'a3' ? '340px' : '320px',
          transform: settingsOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base flex items-center gap-1"><Settings className="w-4 h-4" /> 页面设置</h3>
            <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-5">
            {/* 纸张大小 */}
            <div>
              <Label className="text-sm font-medium">纸张大小</Label>
              <Select value={settings.paperSize} onValueChange={(v: 'a4' | 'a3') => handleSettingChange('paperSize', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="a3">A3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 字体大小 */}
            <div>
              <Label className="text-sm font-medium">字体大小（{FONT_SIZE_LABEL[settings.fontSize]}）</Label>
              <Select value={settings.fontSize} onValueChange={(v: 'small' | 'medium' | 'large') => handleSettingChange('fontSize', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">小（{FONT_SIZE_MAP.small}）</SelectItem>
                  <SelectItem value="medium">中（{FONT_SIZE_MAP.medium}）</SelectItem>
                  <SelectItem value="large">大（{FONT_SIZE_MAP.large}）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 行距 */}
            <div>
              <Label className="text-sm font-medium">行距（{LINE_SPACING_LABEL[settings.lineSpacing]}）</Label>
              <Select value={settings.lineSpacing} onValueChange={(v: 'compact' | 'normal' | 'loose') => handleSettingChange('lineSpacing', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">紧凑（{LINE_SPACING_MAP.compact}）</SelectItem>
                  <SelectItem value="normal">正常（{LINE_SPACING_MAP.normal}）</SelectItem>
                  <SelectItem value="loose">宽松（{LINE_SPACING_MAP.loose}）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">预览时显示答案</Label>
                <Switch checked={settings.showAnswer} onCheckedChange={(v) => handleSettingChange('showAnswer', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">显示分值</Label>
                <Switch checked={settings.showScore} onCheckedChange={(v) => handleSettingChange('showScore', v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">显示知识点</Label>
                <Switch checked={settings.showKnowledgePoints} onCheckedChange={(v) => handleSettingChange('showKnowledgePoints', v)} />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700 mt-4">
              模板参考：标准考试卷格式。调整设置后立即生效并自动保存。
            </div>
          </div>
        </div>
      </div>

      {/* 设置面板关闭状态下的展开按钮 */}
      {!settingsOpen && (
        <button
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-white shadow-lg border rounded-l-lg p-2 z-40 hover:bg-blue-50 transition-colors"
          onClick={() => setSettingsOpen(true)}
          title="打开页面设置"
        >
          <Settings className="w-5 h-5 text-blue-500" />
        </button>
      )}
    </div>
  );
}
