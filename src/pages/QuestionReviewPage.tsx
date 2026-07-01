// QuestionReviewPage — 题目待审池（管理员用）
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { questionApi } from '@/lib/mockApi';
import type { Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function QuestionReviewPage() {
  const { user } = useAuthStore();
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 驳回相关状态
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectQuestionId, setRejectQuestionId] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');

  // 检查是否是管理员
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">权限不足</h1>
        <p className="mt-2 text-gray-600">只有管理员可以访问待审池</p>
      </div>
    );
  }

  // 加载待审题目（只显示 pending 状态）
  const loadPendingQuestions = async () => {
    const { data } = await questionApi.list({ status: 'pending' });
    setPendingQuestions(data);
  };

  useEffect(() => {
    loadPendingQuestions();
  }, []);

  // 审核通过
  const handleApprove = async (id: string) => {
    try {
      const result = await questionApi.publish(id);
      if (result) {
        toast.success('题目已审核通过，已入库');
        loadPendingQuestions();
      } else {
        toast.error('操作失败');
      }
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    }
  };

  // 打开驳回对话框
  const openRejectDialog = (id: string) => {
    setRejectQuestionId(id);
    setRejectReason('');
    setIsRejectDialogOpen(true);
  };

  // 确认驳回
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('请输入驳回原因');
      return;
    }
    try {
      const result = await questionApi.reject(rejectQuestionId, rejectReason.trim());
      if (result) {
        toast.success('题目已驳回，协作者可修改后重新提交');
        setIsRejectDialogOpen(false);
        loadPendingQuestions();
      } else {
        toast.error('操作失败');
      }
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    }
  };

  // 查看题目详情
  const handleViewDetail = (question: Question) => {
    setSelectedQuestion(question);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">题目待审池</h1>
        <p className="text-muted-foreground">
          协作者创建的题目需要管理员审核后才能入库
        </p>
      </div>

      {/* 统计信息 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {pendingQuestions.length}
            </div>
            <div className="text-sm text-muted-foreground">待审核题目</div>
          </div>
        </CardContent>
      </Card>

      {/* 待审题目列表 */}
      {pendingQuestions.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500 py-8">
              暂无待审题目
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingQuestions.map((question) => (
            <Card key={question.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{question.questionType}</Badge>
                      <Badge variant="secondary">{question.grade}</Badge>
                      <Badge variant="secondary">{question.semester}</Badge>
                      <Badge variant="secondary">{question.textbookVersion}</Badge>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < question.difficulty ? 'text-yellow-500' : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {question.contentText}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>创建者：{question.creatorId}</span>
                      <span>创建时间：{new Date(question.createdAt).toLocaleDateString()}</span>
                      {question.knowledgePoints.length > 0 && (
                        <span>知识点：{question.knowledgePoints.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetail(question)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      查看
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(question.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      通过
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openRejectDialog(question.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      驳回
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 题目详情对话框 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>题目详情</DialogTitle>
            <DialogDescription>
              审核题目内容
            </DialogDescription>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{selectedQuestion.questionType}</Badge>
                  <Badge variant="secondary">{selectedQuestion.grade}</Badge>
                  <Badge variant="secondary">{selectedQuestion.semester}</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  难度：
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={i < selectedQuestion.difficulty ? 'text-yellow-500' : 'text-gray-300'}
                    >
                      ★
                    </span>
                  ))}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-1">题目内容</h4>
                <p className="text-sm whitespace-pre-wrap">{selectedQuestion.contentText}</p>
                {selectedQuestion.contentImages.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {selectedQuestion.contentImages.map((url, idx) => (
                      <img key={idx} src={url} alt={`题目图片 ${idx + 1}`} className="max-w-full rounded" />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-1">答案</h4>
                <p className="text-sm whitespace-pre-wrap">{selectedQuestion.answer}</p>
              </div>

              {selectedQuestion.solutionHint && (
                <div>
                  <h4 className="font-medium mb-1">思路点拨</h4>
                  <p className="text-sm text-blue-600 whitespace-pre-wrap">{selectedQuestion.solutionHint}</p>
                </div>
              )}

              {selectedQuestion.solutionDetail && (
                <div>
                  <h4 className="font-medium mb-1">详细解析</h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedQuestion.solutionDetail}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleApprove(selectedQuestion.id);
                    setIsDetailOpen(false);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  审核通过
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setIsDetailOpen(false);
                    openRejectDialog(selectedQuestion.id);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  驳回
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 驳回原因对话框 */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>驳回题目</DialogTitle>
            <DialogDescription>
              请填写驳回原因，协作者将根据此原因修改题目后重新提交。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">驳回原因 *</label>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="例如：答案有误，请核对&#10;题目表述不清晰，请修改&#10;知识点标注错误..."
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              确认驳回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
