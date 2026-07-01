// 题目详情抽屉/弹窗
import type { Question } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Edit, Printer, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  question: Question | null;
  onClose: () => void;
}

export default function QuestionDetailDialog({ open, question, onClose }: Props) {
  const navigate = useNavigate();

  if (!question) return null;

  const difficultyStars = '★'.repeat(question.difficulty) + '☆'.repeat(5 - question.difficulty);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-lg">题目详情</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1" /> 打印
              </Button>
              <Button size="sm" onClick={() => { onClose(); navigate(`/questions/${question.id}/edit`); }}>
                <Edit className="w-4 h-4 mr-1" /> 编辑
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="px-6 py-4 max-h-[calc(90vh-64px)]">
          {/* 标签行 */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge variant="secondary">{question.questionType}</Badge>
            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
              {difficultyStars}（{question.difficulty}星）
            </Badge>
            {question.isFrequentMistake && (
              <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />高频易错</Badge>
            )}
            <span className="text-xs text-gray-500">{question.grade} · {question.semester} · {question.textbookVersion}</span>
            {question.unit && (
              <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs">
                {question.unit.replace(/^第[一二三四五六七八九十]+单元\s*/, '')}
              </Badge>
            )}
          </div>

          {/* 题目内容 */}
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">题目内容</div>
            <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
              {question.contentText}
            </div>
          </div>

          {/* 题目图片 */}
          {question.contentImages && question.contentImages.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">题目图片</div>
              <div className="flex gap-2 flex-wrap">
                {question.contentImages.map((img, i) => (
                  <img key={i} src={img} alt={`题目图片${i + 1}`} className="max-w-xs max-h-48 rounded border" />
                ))}
              </div>
            </div>
          )}

          {/* 答案 */}
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> 答案
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm whitespace-pre-wrap">
              {question.answer}
            </div>
          </div>

          {/* 思路点拨（教师用） */}
          {question.solutionHint && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">💡 思路点拨（教师用）</div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm whitespace-pre-wrap">
                {question.solutionHint}
              </div>
            </div>
          )}

          {/* 详细解析 */}
          {question.solutionDetail && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">📝 详细解析</div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm whitespace-pre-wrap">
                {question.solutionDetail}
              </div>
            </div>
          )}

          {/* 知识点 */}
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">知识点</div>
            <div className="flex gap-1 flex-wrap">
              {question.knowledgePoints.map(kp => (
                <Badge key={kp} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{kp}</Badge>
              ))}
            </div>
          </div>

          {/* 元信息 */}
          <div className="pt-3 border-t text-xs text-gray-400 flex gap-4 flex-wrap">
            <span>来源：{question.source || '未填写'}</span>
            <span>创建：{new Date(question.createdAt).toLocaleDateString('zh-CN')}</span>
            {question.mistakeRate !== null && (
              <span className={question.mistakeRate >= 60 ? 'text-red-500 font-medium' : ''}>
                错题率：{question.mistakeRate}%
              </span>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
