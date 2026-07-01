// 试卷篮 Store（全局单例）
import { create } from 'zustand';
import type { Question } from '@/types';

interface BasketItem {
  questionId: string;
  question: Question;
  addedAt: string;
}

interface BasketState {
  items: BasketItem[];
  /** 添加题目到试卷篮 */
  add: (question: Question) => { success: boolean; message: string; isDuplicate: boolean };
  /** 移除题目 */
  remove: (questionId: string) => void;
  /** 清空试卷篮 */
  clear: () => void;
  /** 重新排序（拖拽后调用） */
  reorder: (newItems: BasketItem[]) => void;
  /** 获取数量 */
  getCount: () => number;
  /** 检测重复（相同知识点+相同题型） */
  checkDuplicate: (question: Question) => boolean;
  /** 获取去重建议 */
  getDuplicates: () => BasketItem[][];
}

/** 从 localStorage 恢复 */
function loadBasket(): BasketItem[] {
  try {
    const raw = localStorage.getItem('mqb_basket');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBasket(items: BasketItem[]): void {
  localStorage.setItem('mqb_basket', JSON.stringify(items));
}

export const useBasketStore = create<BasketState>((set, get) => ({
  items: loadBasket(),

  add: (question) => {
    const items = get().items;
    // 检查是否已存在
    if (items.some(i => i.questionId === question.id)) {
      return { success: false, message: '该题已在试卷篮中', isDuplicate: false };
    }
    // 检查知识点+题型重复
    const duplicate = items.find(i =>
      i.question.knowledgePoints.some(kp => question.knowledgePoints.includes(kp)) &&
      i.question.questionType === question.questionType
    );
    const newItem: BasketItem = { questionId: question.id, question, addedAt: new Date().toISOString() };
    const newItems = [...items, newItem];
    set({ items: newItems });
    saveBasket(newItems);
    if (duplicate) {
      return { success: true, message: '已加入试卷篮（注意：存在同类知识点题目）', isDuplicate: true };
    }
    return { success: true, message: '已加入试卷篮', isDuplicate: false };
  },

  remove: (questionId) => {
    const newItems = get().items.filter(i => i.questionId !== questionId);
    set({ items: newItems });
    saveBasket(newItems);
  },

  clear: () => {
    set({ items: [] });
    saveBasket([]);
  },

  reorder: (newItems) => {
    set({ items: newItems });
    saveBasket(newItems);
  },

  getCount: () => get().items.length,

  checkDuplicate: (question) => {
    return get().items.some(i =>
      i.question.knowledgePoints.some(kp => question.knowledgePoints.includes(kp)) &&
      i.question.questionType === question.questionType
    );
  },

  getDuplicates: () => {
    const items = get().items;
    const groups: BasketItem[][] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.questionId)) continue;
      const group = [item];
      seen.add(item.questionId);
      for (const other of items) {
        if (seen.has(other.questionId)) continue;
        if (item.questionId !== other.questionId &&
          item.question.knowledgePoints.some(kp => other.question.knowledgePoints.includes(kp)) &&
          item.question.questionType === other.question.questionType) {
          group.push(other);
          seen.add(other.questionId);
        }
      }
      if (group.length > 1) groups.push(group);
    }
    return groups;
  },
}));
