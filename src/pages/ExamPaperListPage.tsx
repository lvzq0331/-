// 试卷列表页 - 管理员可编辑删除，协作者只能预览/导出/打印
import { useState, useEffect } from 'react';
import { examPaperApi } from '@/lib/mockApi';
import { useAuthStore } from '@/stores/authStore';
import type { ExamPaper, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Trash2, FileEdit, Eye, Download, Printer, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/** 通过 userId 获取用户信息 */
function getUserInfo(userId: string): { name: string; school: string; role: string } {
  try {
    const users: User[] = JSON.parse(localStorage.getItem('mqb_users') || '[]');
    const u = users.find(user => user.id === userId);
    if (u) return { name: u.displayName || u.username, school: u.school || '', role: u.role };
  } catch {}
  return { name: '', school: '', role: '' };
}

export default function ExamPaperListPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';
  const [papers, setPapers] = useState<ExamPaper[]>([]);

  useEffect(() => {
    (async () => {
      const list = await examPaperApi.list();
      setPapers(list);
    })();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这份试卷吗？')) return;
    await examPaperApi.delete(id);
    const list = await examPaperApi.list();
    setPapers(list);
    toast.success('试卷已删除');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">试卷</h1>
        {isAdmin && (
          <Button onClick={() => navigate('/exams/create')}>
            <Plus className="w-4 h-4 mr-2" /> 创建试卷
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {papers.map(p => {
          const creator = getUserInfo(p.userId);
          const isOwner = p.userId === user?.id;
          // 管理员可以操作所有，协作者不能编辑/删除
          const canEdit = isAdmin;
          const canDelete = isAdmin;

          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/exams/${p.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.grade}{p.semester} · {p.textbookVersion}
                        · {p.questionIds?.length || 0}题 · {p.totalScore}分
                        {p.includeSolution ? ' · 含答案' : ''}
                      </p>
                      {/* 组卷人信息 */}
                      {(creator.name) && (
                        <div className="flex items-center gap-1 mt-1">
                          <UserCircle className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {creator.name}
                            {creator.school ? ` · ${creator.school}` : ''}
                          </span>
                        </div>
                      )}
                      {/* 协作者标识：自己创建的试卷 */}
                      {!isAdmin && isOwner && (
                        <Badge variant="outline" className="mt-1 text-xs text-blue-600 border-blue-300">
                          我创建的
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {canEdit && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/exams/${p.id}/edit`)} title="编辑">
                        <FileEdit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(p.id)} title="删除">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {/* 所有人都可以预览、导出、打印（在详情页） */}
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/exams/${p.id}`)} title="预览">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {papers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            暂无试卷{isAdmin ? '，点击「创建试卷」开始组卷' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
