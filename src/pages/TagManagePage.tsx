// 标签管理页（Supabase 版本 - 异步数据加载）
import { useState, useEffect } from 'react';
import { tagApi } from '@/lib/mockApi';
import type { Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TagManagePage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTags = async () => {
    try {
      const list = await tagApi.list();
      setTags(list);
    } catch (e) {
      toast.error('加载标签失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTags();
  }, []);

  const handleAdd = async () => {
    const name = newTagName.trim();
    if (!name) return;
    if (tags.some(t => t.name === name)) {
      toast.error('知识点已存在');
      return;
    }
    try {
      await tagApi.create({ type: 'knowledge', name, parentId: null });
      await loadTags();
      setNewTagName('');
      toast.success('知识点已添加');
    } catch (e) {
      toast.error('添加失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tagApi.delete(id);
      await loadTags();
      toast.success('已删除');
    } catch (e) {
      toast.error('删除失败');
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">加载中...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">知识点标签管理</h1>

      {/* 添加新标签 */}
      <Card className="mb-4">
        <CardContent className="p-4 flex gap-2">
          <Input
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            placeholder="输入新知识点名称"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-1" /> 添加
          </Button>
        </CardContent>
      </Card>

      {/* 标签列表 */}
      <Card>
        <CardContent className="p-4 space-y-2">
          {tags.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无知识点标签</p>
          ) : (
            tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded group">
                <Badge variant="secondary" className="px-3 py-1 text-sm">{tag.name}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(tag.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
