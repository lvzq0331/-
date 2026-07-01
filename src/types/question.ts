// 题目类型定义

export type Grade = '一年级' | '二年级' | '三年级' | '四年级' | '五年级' | '六年级';

export type Semester = '上册' | '下册';

export type TextbookVersion = '人教版' | '北师大版' | '苏教版' | '其他';

export type QuestionType = '选择题' | '填空题' | '计算题' | '解决问题' | '操作题';

export type QuestionStatus = 'pending' | 'published' | 'rejected';

/** 难度 1-5 星 */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** 题目内容类型 */
export type ContentType = 'text' | 'image' | 'text+image';

/** 题目实体 */
export interface Question {
  id: string;
  creatorId: string;
  status: QuestionStatus;
  contentType: ContentType;
  contentText: string;
  contentImages: string[];
  answer: string;
  solutionHint: string;       // 思路点拨（教师用）
  solutionDetail: string;     // 详细解析
  grade: Grade;
  semester: Semester;
  textbookVersion: TextbookVersion;
  unit: string;               // 教材章节/单元
  knowledgePoints: string[];  // 多知识点关联
  questionType: QuestionType;
  difficulty: Difficulty;
  isFrequentMistake: boolean;
  mistakeRate: number | null; // 百分比 0-100
  source: string;
  sortOrder: number;
  createdAt: string;          // ISO 日期字符串
  updatedAt: string;
  publishedAt: string | null;
  rejectedAt: string | null;    // 驳回时间
  rejectionReason: string | null; // 驳回原因（管理员填写）
}

/** 创建/编辑题目表单 */
export interface QuestionFormData {
  contentType: ContentType;
  contentText: string;
  contentImages: string[];
  answer: string;
  solutionHint: string;
  solutionDetail: string;
  grade: Grade;
  semester: Semester;
  textbookVersion: TextbookVersion;
  unit: string;               // 教材章节/单元
  knowledgePoints: string[];
  questionType: QuestionType;
  difficulty: Difficulty;
  isFrequentMistake: boolean;
  source: string;
}

/** 题目列表筛选参数 */
export interface QuestionFilter {
  grade?: Grade;
  semester?: Semester;
  textbookVersion?: TextbookVersion;
  knowledgePoints?: string[];
  questionType?: QuestionType;
  difficultyMin?: Difficulty;
  difficultyMax?: Difficulty;
  isFrequentMistake?: boolean;
  status?: QuestionStatus;
  keyword?: string;
  page: number;
  pageSize: number;
  sortBy: 'createdAt' | 'updatedAt' | 'difficulty' | 'grade';
  sortOrder: 'asc' | 'desc';
}

/** 变式题关联 */
export interface QuestionVariant {
  questionId: string;
  variantId: string;
  relationType: string; // 如 "同源变式"、"A/B卷"
}
