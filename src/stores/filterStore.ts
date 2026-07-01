// 筛选条件 Store
import { create } from 'zustand';
import type { Grade, Semester, TextbookVersion, QuestionType, Difficulty, QuestionStatus } from '@/types';

interface FilterState {
  grade: Grade | '';
  semester: Semester | '';
  textbookVersion: TextbookVersion | '';
  knowledgePoints: string[];
  questionType: QuestionType | '';
  difficultyMin: Difficulty | '';
  difficultyMax: Difficulty | '';
  isFrequentMistake: boolean;
  status: QuestionStatus | '';
  keyword: string;
  page: number;
  pageSize: number;
  sortBy: 'createdAt' | 'updatedAt' | 'difficulty' | 'grade';
  sortOrder: 'asc' | 'desc';
  setFilter: (key: string, value: unknown) => void;
  reset: () => void;
}

const DEFAULTS: Omit<FilterState, 'setFilter' | 'reset'> = {
  grade: '',
  semester: '',
  textbookVersion: '',
  knowledgePoints: [],
  questionType: '',
  difficultyMin: '',
  difficultyMax: '',
  isFrequentMistake: false,
  status: 'published',
  keyword: '',
  page: 1,
  pageSize: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export const useFilterStore = create<FilterState>((set) => ({
  ...DEFAULTS,
  setFilter: (key, value) => set({ [key]: value, page: 1 }),
  reset: () => set(DEFAULTS),
}));
