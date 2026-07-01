// 试卷篮悬浮球 + 抽屉面板（支持自由拖动 + 位置持久化）
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBasketStore } from '@/stores/basketStore';
import { Button } from '@/components/ui/button';
import { BookOpen, Trash2, Send, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'basket-ball-position';

interface BallPosition {
  x: number; // right
  y: number; // top
}

function loadPosition(): BallPosition {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.x === 'number' && typeof p.y === 'number') return p;
    }
  } catch {}
  return { x: 16, y: 240 }; // 默认 right: 16px, top: 240px
}

export default function BasketFloatingBall() {
  const items = useBasketStore(s => s.items);
  const remove = useBasketStore(s => s.remove);
  const clear = useBasketStore(s => s.clear);
  const getDuplicates = useBasketStore(s => s.getDuplicates);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // 先在 hooks 区域顶部读取所有需要的值
  const duplicates = getDuplicates();

  // 悬浮球位置
  const [pos, setPos] = useState<BallPosition>(() => loadPosition());
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const ballRef = useRef<HTMLButtonElement>(null);
  const didDrag = useRef(false);

  // 持久化位置
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  }, [pos]);

  // 拖拽处理
  useEffect(() => {
    if (!dragging) return;

    const onMove = (clientX: number, clientY: number) => {
      if (!dragStart.current) return;
      const dx = clientX - dragStart.current.pointerX;
      const dy = clientY - dragStart.current.pointerY;
      // 移动超过 3px 才算真正拖拽
      if (!didDrag.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        didDrag.current = true;
      }
      if (didDrag.current) {
        const ballSize = 56; // w-14 = 56px
        const newX = Math.max(0, Math.min(window.innerWidth - ballSize, dragStart.current.x - dx));
        const newY = Math.max(0, Math.min(window.innerHeight - ballSize, dragStart.current.y + dy));
        setPos({ x: newX, y: newY });
      }
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) {
        onMove(t.clientX, t.clientY);
        e.preventDefault();
      }
    };
    const onEnd = () => {
      setDragging(false);
      // 延迟清空拖拽标记，让 click 事件可以识别
      setTimeout(() => { didDrag.current = false; }, 0);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, [dragging]);

  const startDrag = (clientX: number, clientY: number) => {
    dragStart.current = { pointerX: clientX, pointerY: clientY, x: pos.x, y: pos.y };
    setDragging(true);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) startDrag(t.clientX, t.clientY);
  };

  const onClick = () => {
    // 如果刚拖拽过则不触发
    if (didDrag.current) return;
    setOpen(!open);
  };

  if (items.length === 0) return null;

  return (
    <>
      {/* 悬浮球 — 可自由拖动 */}
      <button
        ref={ballRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={onClick}
        style={{
          right: `${pos.x}px`,
          top: `${pos.y}px`,
          transform: 'none',
          transition: dragging ? 'none' : 'box-shadow 0.2s',
          touchAction: 'none',
        }}
        className={`fixed z-40 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 hover:scale-110 ${
          dragging ? 'cursor-grabbing scale-110' : 'cursor-grab'
        }`}
        title="按住拖动 · 点击打开试卷篮"
      >
        <div className="relative pointer-events-none">
          <BookOpen className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-xs flex items-center justify-center font-bold">
            {items.length}
          </span>
        </div>
        {/* 拖拽手柄指示 */}
        <GripVertical className="absolute top-1 right-1 w-3 h-3 opacity-40 pointer-events-none" />
      </button>

      {/* 抽屉面板 — 从悬浮球左侧弹出 */}
      {open && (
        <>
          {/* 透明遮罩 */}
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
          {/* 抽屉本体 — 根据悬浮球在屏幕中线的左右位置自动切换弹出方向 */}
          <div
            className="fixed z-50 w-80 max-h-[80vh] bg-white shadow-2xl rounded-xl border p-4 overflow-auto animate-in fade-in"
            style={((): React.CSSProperties => {
              const BALL_SIZE = 56;
              const DRAWER_WIDTH = 320;
              const GAP = 16;
              const ballLeft = window.innerWidth - pos.x - BALL_SIZE; // 球左边到屏幕左边的距离
              // 以页面中线为界判断抽屉应该弹到球的左边还是右边
              const isOnLeftHalf = ballLeft < window.innerWidth / 2;
              let drawerLeft: number;
              if (isOnLeftHalf) {
                // 球在左半屏 → 抽屉弹到球的右边
                drawerLeft = ballLeft + BALL_SIZE + GAP;
              } else {
                // 球在右半屏 → 抽屉弹到球的左边
                drawerLeft = ballLeft - DRAWER_WIDTH - GAP;
              }
              // 横向边界保护
              drawerLeft = Math.max(8, Math.min(window.innerWidth - DRAWER_WIDTH - 8, drawerLeft));
              return {
                left: `${drawerLeft}px`,
                top: `${Math.max(8, pos.y - 100)}px`,
              };
            })()}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                试卷篮 ({items.length} 题)
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>✕</Button>
            </div>

            {/* 去重提示 */}
            {duplicates.length > 0 && (
              <div className="bg-orange-50 text-orange-700 text-xs p-2 rounded mb-3">
                ⚠️ 检测到 {duplicates.length} 组同类知识点题目，建议去重
              </div>
            )}

            {/* 题目列表 */}
            <div className="space-y-2 mb-3 max-h-96 overflow-auto">
              {items.map((item, idx) => (
                <div key={item.questionId} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                  <span className="text-gray-400 w-6 text-right">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="line-clamp-1">{item.question.contentText || '(仅图片)'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {item.question.questionType} · 难度 {'★'.repeat(item.question.difficulty)}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(item.questionId)}
                    className="text-red-400 hover:text-red-600 shrink-0"
                    title="移除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => { clear(); setOpen(false); toast.success('试卷篮已清空'); }}
              >
                清空
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => { setOpen(false); navigate('/exams/create'); }}
              >
                <Send className="w-3 h-3 mr-1" /> 生成试卷
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
