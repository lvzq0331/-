// 试卷类型定义

import type { Question, Grade, Semester, TextbookVersion } from './question';

/** 试卷实体 */
export interface ExamPaper {
  id: string;
  userId: string;
  title: string;
  description: string;
  grade: Grade;
  semester: Semester;
  textbookVersion: TextbookVersion;
  totalScore: number;
  difficultyDistribution: Record<string, number>; // 如 { "3星": 60, "4-5星": 40 }
  includeSolution: boolean;
  questionIds: string[];   // 题目ID列表（有序）
  questionScores: Record<string, number>; // 题目ID -> 分值
  sectionTitles: Record<string, string>;  // 题目ID -> 大题标题
  createdAt: string;
  updatedAt: string;
}

/** 试卷中的题目（含排序） */
export interface ExamPaperQuestion {
  id: string;
  examPaperId: string;
  questionId: string;
  question: Question;
  sortOrder: number;
  score: number;
  sectionTitle: string;
}

/** 创建/编辑试卷表单 */
export interface ExamPaperFormData {
  title: string;
  description: string;
  grade: Grade;
  semester: Semester;
  textbookVersion: TextbookVersion;
  totalScore: number;
  difficultyDistribution: Record<string, number>;
  includeSolution: boolean;
  questions: ExamPaperQuestionInput[];
}

export interface ExamPaperQuestionInput {
  questionId: string;
  score: number;
  sectionTitle: string;
}

/** 智能组卷参数 */
export interface SmartGenerateParams {
  grade: Grade;
  semester: Semester;
  textbookVersion: TextbookVersion;
  knowledgePoints: string[];
  questionTypes: string[];
  difficultyDistribution: Record<string, number>; // 难度 -> 题量
  totalCount: number;
}

/** 智能组卷结果 */
export interface SmartGenerateResult {
  questions: Question[];
  distribution: Record<string, number>; // 实际分布
}
