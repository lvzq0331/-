// 题目卡片组件
import { useMemo } from 'react';
import type { Question, User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useBasketStore } from '@/stores/basketStore';
import { useAuthStore } from '@/stores/authStore';
import { BookOpen, Plus, Check, Pencil, Trash2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { questionApi } from '@/lib/mockApi';

interface Props {
  question: Question;
  onView: () => void;
  onRefresh?: () => void;
}

/** 获取题目创建者信息 */
function getCreatorInfo(creatorId: string): { name: string; school: string; role: string } {
  try {
    const users = JSON.parse(localStorage.getItem('mqb_users') || '[]');
    const creator = users.find((u: User) => u.id === creatorId);
    if (creator) {
      return {
        name: creator.displayName || creator.username,
        school: creator.school || '',
        role: creator.role || '',
      };
    }
  } catch (e) {
    // ignore parse errors
  }
  return { name: '', school: '', role: '' };
}

export default function QuestionCard({ question, onView, onRefresh }: Props) {
  const navigate = useNavigate();
  const add = useBasketStore(s => s.add);
  const remove = useBasketStore(s => s.remove);
  const items = useBasketStore(s => s.items);
  const isInBasket = items.some(i => i.questionId === question.id);
  
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';
  const isOwner = user?.id === question.creatorId;
  const canEdit = isAdmin || (isOwner && (question.status === 'pending' || question.status === 'rejected'));
  const canDelete = isAdmin || (isOwner && question.status === 'pending');

  // 获取创建者信息（仅对非管理员创建的题目显示）
  const creatorInfo = useMemo(() => getCreatorInfo(question.creatorId), [question.creatorId]);
  const showCreator = !isAdmin || creatorInfo.role !== 'admin';

  const difficultyStars = '★'.repeat(question.difficulty) + '☆'.repeat(5 - question.difficulty);

  const handleAdd = () => {
    if (isInBasket) {
      remove(question.id);
      toast.success('已从试卷篮移除');
    } else {
      const result = add(question);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这道题吗？此操作不可恢复。')) return;

    try {
      const result = await questionApi.delete(question.id);
      if (result.success) {
        toast.success('题目已删除');
        if (onRefresh) onRefresh();
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || '删除失败');
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* 标签行 */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary">{question.questionType}</Badge>
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                {difficultyStars}
              </Badge>
              {question.isFrequentMistake && (
                <Badge variant="destructive" className="text-xs">高频易错</Badge>
              )}
              {question.status === 'pending' && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  待审
                </Badge>
              )}
              {question.status === 'published' && (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  已发布
                </Badge>
              )}
              <span className="text-xs text-gray-400">{question.grade}{question.semester}</span>
              <span className="text-xs text-gray-400">{question.textbookVersion}</span>
              {question.unit && (
                <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded truncate max-w-[180px]" title={question.unit}>
                  {question.unit.replace(/^第[一二三四五六七八九十]+单元\s*/, '')}
                </span>
              )}
            </div>
            {/* 题目内容 */}
            <p className="text-sm font-medium line-clamp-2 mb-1">{question.contentText}</p>
            {/* 知识点 */}
            <div className="flex gap-1 flex-wrap mb-1">
              {question.knowledgePoints.map(kp => (
                <span key={kp} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{kp}</span>
              ))}
            </div>
            {/* 上传者信息 - 协作者上传的题目显示 */}
            {showCreator && creatorInfo.name && (
              <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-100">
                <UserCircle className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {creatorInfo.name}
                  {creatorInfo.school ? ` · ${creatorInfo.school}` : ''}
                </span>
              </div>
            )}
          </div>
          {/* 操作按钮 */}
          <div className="flex flex-col gap-2 shrink-0" onClick={e => e.stopPropagation()}>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/questions/${question.id}/edit`)}>
                <Pencil className="w-4 h-4" />
                编辑
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            )}
            <Button size="sm" variant={isInBasket ? 'default' : 'outline'} onClick={handleAdd}>
              {isInBasket ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isInBasket ? '已加' : '试卷篮'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
