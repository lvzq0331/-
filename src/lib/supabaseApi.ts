// Supabase API 层 — 替代 mockApi，数据存储到云端 Supabase
// 接口签名与 mockApi 完全一致，所有页面组件无需改动

import { supabase } from './supabase';
import type {
  Question, QuestionFormData, QuestionFilter,
  ExamPaper, ExamPaperFormData,
  Tag, User, RegisterFormData, LoginFormData,
} from '@/types';

// ─── 工具函数：camelCase ↔ snake_case ──────────────────

function toSnake<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

function toCamel<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

function now(): string {
  return new Date().toISOString();
}

/** 将数据库行转换为前端 Question 对象 */
function rowToQuestion(row: Record<string, unknown>): Question {
  const c = toCamel(row as any);
  return {
    id: c.id as string,
    creatorId: c.creatorId as string,
    status: c.status as Question['status'],
    contentType: c.contentType as Question['contentType'],
    contentText: c.contentText as string || '',
    contentImages: (c.contentImages as string[]) || [],
    answer: c.answer as string || '',
    solutionHint: c.solutionHint as string || '',
    solutionDetail: c.solutionDetail as string || '',
    grade: c.grade as Question['grade'],
    semester: c.semester as Question['semester'],
    textbookVersion: c.textbookVersion as Question['textbookVersion'],
    unit: c.unit as string || '',
    knowledgePoints: (c.knowledgePoints as string[]) || [],
    questionType: c.questionType as Question['questionType'],
    difficulty: c.difficulty as Question['difficulty'],
    isFrequentMistake: !!c.isFrequentMistake,
    mistakeRate: c.mistakeRate as number | null,
    source: c.source as string || '',
    sortOrder: (c.sortOrder as number) || 0,
    createdAt: c.createdAt as string,
    updatedAt: c.updatedAt as string,
    publishedAt: c.publishedAt as string | null,
    rejectedAt: c.rejectedAt as string | null,
    rejectionReason: c.rejectionReason as string | null,
  };
}

/** 将数据库行转换为前端 User 对象 */
function rowToUser(row: Record<string, unknown>, authId?: string): User {
  const c = toCamel(row as any);
  return {
    id: authId || (c.id as string),
    username: c.username as string,
    displayName: (c.displayName as string) || '',
    school: (c.school as string) || '',
    role: ((c.role as string) || 'collaborator') as User['role'],
    createdAt: c.createdAt as string || now(),
  };
}

// ─── 纯数据库认证（不需要 Supabase Auth）──────────────────
// 用户名+密码直接存数据库，无需邮箱验证

// 内存缓存当前用户（避免频繁查库）
let _currentUser: User | null = null;

export const authApi = {
  async register(data: RegisterFormData): Promise<{ success: boolean; message: string; user?: User }> {
    if (data.password !== data.confirmPassword) {
      return { success: false, message: '两次密码不一致' };
    }

    try {
      // 1. 检查用户名是否已存在
      const { data: existing, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', data.username)
        .limit(1);

      if (checkError) throw new Error(checkError.message);
      if (existing && existing.length > 0) {
        return { success: false, message: '用户名已存在' };
      }

      // 2. 检查是否是第一个用户（第一个自动成为管理员）
      let isFirstUser = false;
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      isFirstUser = (count ?? 0) === 0;

      // 3. 创建用户（直接写入数据库）
      const userId = crypto.randomUUID(); // 标准UUID格式：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const userData = {
        id: userId,
        username: data.username,
        display_name: data.displayName,
        school: data.school || null,
        password_hash: data.password,
        role: isFirstUser ? 'admin' : 'collaborator',
        created_at: now(),
      };

      const { error: insertError } = await supabase.from('users').insert(userData);
      if (insertError) throw new Error(`创建用户失败: ${insertError.message}`);

      // 4. 自动登录
      const user: User = {
        id: userId,
        username: data.username,
        displayName: data.displayName,
        school: data.school || '',
        role: isFirstUser ? 'admin' : 'collaborator',
        createdAt: now(),
      };
      _currentUser = user;
      localStorage.setItem('mqb_current_user_id', userId);
      localStorage.setItem('mqb_current_user', JSON.stringify(user));

      return { success: true, message: isFirstUser ? '注册成功！您是管理员' : '注册成功！', user };
    } catch (e: any) {
      console.error('[注册] 异常:', e);
      return { success: false, message: `注册失败: ${e?.message || '未知错误'}` };
    }
  },

  async login(data: LoginFormData): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const { data: rows, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', data.username)
        .limit(1);

      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) {
        return { success: false, message: '用户名或密码错误' };
      }

      const row = rows[0];
      if (row.password_hash !== data.password) {
        return { success: false, message: '用户名或密码错误' };
      }

      const user = rowToUser(row as any);
      _currentUser = user;
      localStorage.setItem('mqb_current_user_id', user.id);
      localStorage.setItem('mqb_current_user', JSON.stringify(user));
      return { success: true, message: '登录成功', user };
    } catch (e: any) {
      return { success: false, message: `登录异常: ${e?.message || '未知错误'}` };
    }
  },

  async logout(): Promise<void> {
    _currentUser = null;
    localStorage.removeItem('mqb_current_user_id');
    localStorage.removeItem('mqb_current_user');
  },

  async getCurrentUser(): Promise<User | null> {
    if (_currentUser) return _currentUser;

    // 从 localStorage 恢复完整用户信息（优先，避免每次都查库）
    try {
      const cached = localStorage.getItem('mqb_current_user');
      if (cached && cached !== 'null') {
        const user = JSON.parse(cached);
        _currentUser = user;
        return _currentUser;
      }
    } catch (e) {
      // 解析失败，继续尝试用 ID 查库
    }

    // 回退：用 ID 查库
    const cachedId = localStorage.getItem('mqb_current_user_id');
    if (!cachedId) return null;

    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', cachedId).single();
      if (error || !data) return null;
      _currentUser = rowToUser(data as any);
      localStorage.setItem('mqb_current_user', JSON.stringify(_currentUser));
      return _currentUser;
    } catch (e) {
      return null;
    }
  },

  /** 获取用户的扩展信息 */
  async fetchUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error || !data) return null;
    return rowToUser(data as any);
  },
};

// ─── Question API ─────────────────────────────────────────

export const questionApi = {
  async list(filter?: Partial<QuestionFilter>): Promise<{ data: Question[]; total: number }> {
    let query = supabase.from('questions').select('*', { count: 'exact' });

    // 筛选条件
    if (filter?.grade) query = query.eq('grade', filter.grade);
    if (filter?.semester) query = query.eq('semester', filter.semester);
    if (filter?.textbookVersion) query = query.eq('textbook_version', filter.textbookVersion);
    if (filter?.questionType) query = query.eq('question_type', filter.questionType);
    if (filter?.isFrequentMistake) query = query.eq('is_frequent_mistake', true);
    if (filter?.status) query = query.eq('status', filter.status);

    // 关键词搜索
    if (filter?.keyword) {
      const kw = filter.keyword;
      query = query.or(`content_text.ilike.%${kw}%,answer.ilike.%${kw}%`);
    }

    // 排序
    const sortBy = filter?.sortBy || 'created_at';
    const sortOrder = filter?.sortOrder === 'asc' ? true : false;
    query = query.order(sortBy, { ascending: sortOrder });

    // 分页
    const page = filter?.page || 1;
    const pageSize = filter?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('查询题目失败:', error);
      return { data: [], total: 0 };
    }

    const questions = (data || []).map((row: any) => rowToQuestion(row));
    return { data: questions, total: count || 0 };
  },

  async getById(id: string): Promise<Question | null> {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return rowToQuestion(data as any);
  },

  async create(data: QuestionFormData, creatorId: string): Promise<Question> {
    const currentUser = await authApi.getCurrentUser();
    const status = currentUser?.role === 'admin' ? 'published' : 'pending';

    const rowData = {
      ...toSnake(data),
      creator_id: currentUser?.id || creatorId,
      status,
      created_at: now(),
      updated_at: now(),
      published_at: status === 'published' ? now() : null,
    };

    const { data: inserted, error } = await supabase
      .from('questions')
      .insert(rowData as any)
      .select()
      .single();

    if (error) throw new Error(`创建题目失败: ${error.message}`);
    return rowToQuestion(inserted as any);
  },

  async update(id: string, data: Partial<QuestionFormData>): Promise<Question | null> {
    const currentUser = await authApi.getCurrentUser();
    if (!currentUser) throw new Error('请先登录');

    // 先获取当前题目做权限检查
    const existing = await this.getById(id);
    if (!existing) throw new Error('题目不存在');

    const isAdmin = currentUser.role === 'admin';
    const isOwner = currentUser.id === existing.creatorId;

    if (!isAdmin) {
      if (!isOwner) throw new Error('您只能编辑自己创建的题目');
      if (existing.status !== 'pending' && existing.status !== 'rejected') {
        throw new Error('题目已审核通过，不能修改');
      }
    }

    const rowData = {
      ...toSnake(data as any),
      updated_at: now(),
    };

    const { data: updated, error } = await supabase
      .from('questions')
      .update(rowData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`更新题目失败: ${error.message}`);
    return rowToQuestion(updated as any);
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const currentUser = await authApi.getCurrentUser();
    if (!currentUser) return { success: false, message: '请先登录' };

    const existing = await this.getById(id);
    if (!existing) return { success: false, message: '题目不存在' };

    const isAdmin = currentUser.role === 'admin';
    const isOwner = currentUser.id === existing.creatorId;

    if (!isAdmin) {
      if (!isOwner) return { success: false, message: '您只能删除自己创建的题目' };
      if (existing.status !== 'pending') return { success: false, message: '题目已审核通过，不能删除' };
    }

    const { error } = await supabase.from('questions').delete().eq('id', id);

    if (error) return { success: false, message: `删除失败: ${error.message}` };
    return { success: true, message: '题目已删除' };
  },

  listPending(): Promise<Question[]> {
    return this.list({ status: 'pending', page: 1, pageSize: 1000 }).then(r => r.data);
  },

  async publish(id: string): Promise<Question | null> {
    return this.update(id, { status: 'published' } as any);
  },

  async reject(id: string, reason: string): Promise<Question | null> {
    const { data, error } = await supabase
      .from('questions')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        rejected_at: now(),
        updated_at: now(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`驳回失败: ${error.message}`);
    return rowToQuestion(data as any);
  },

  async resubmit(id: string): Promise<Question | null> {
    const { data, error } = await supabase
      .from('questions')
      .update({
        status: 'pending',
        rejection_reason: null,
        rejected_at: null,
        updated_at: now(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`重新提交失败: ${error.message}`);
    return rowToQuestion(data as any);
  },
};

// ─── Tag API ──────────────────────────────────────────────

export const tagApi = {
  async list(): Promise<Tag[]> {
    const { data, error } = await supabase.from('tags').select('*').order('sort_order');
    if (error) { console.error('获取标签失败:', error); return []; }
    return (data || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      parentId: row.parent_id,
      sortOrder: row.sort_order,
    }));
  },

  async listTree(): Promise<Tag[]> {
    const tags = await this.list();
    const map = new Map<string, Tag & { children?: Tag[] }>();
    const roots: (Tag & { children?: Tag[] })[] = [];
    for (const t of tags) map.set(t.id, { ...t, children: [] });
    for (const t of tags) {
      const node = map.get(t.id)!;
      if (t.parentId && map.has(t.parentId)) {
        map.get(t.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  },

  async create(data: Omit<Tag, 'id' | 'sortOrder'>): Promise<Tag> {
    const currentList = await this.list();
    const { data: inserted, error } = await supabase
      .from('tags')
      .insert({ ...toSnake(data), sort_order: currentList.length } as any)
      .select()
      .single();
    if (error) throw error;
    return {
      id: inserted.id,
      type: inserted.type,
      name: inserted.name,
      parentId: inserted.parent_id,
      sortOrder: inserted.sort_order,
    };
  },

  async update(id: string, data: Partial<Omit<Tag, 'id'>>): Promise<Tag | null> {
    const { data: updated, error } = await supabase
      .from('tags')
      .update(toSnake(data as any))
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return {
      id: updated.id,
      type: updated.type,
      name: updated.name,
      parentId: updated.parent_id,
      sortOrder: updated.sort_order,
    };
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) return false;

    // 同时删除子标签
    await supabase.from('tags').delete().eq('parent_id', id);
    return true;
  },
};

// ─── Exam Paper API ───────────────────────────────────────

export const examPaperApi = {
  async list(): Promise<ExamPaper[]> {
    let query = supabase.from('exam_papers').select('*').order('created_at', { ascending: false });

    // 非管理员只看自己的试卷
    try {
      const currentUser = await authApi.getCurrentUser();
      if (currentUser?.role !== 'admin') {
        query = query.eq('creator_id', currentUser?.id);
      }
    } catch (e) {
      // 未登录时不过滤
    }

    const { data, error } = await query;
    if (error) { console.error('获取试卷列表失败:', error); return []; }

    return (data || []).map((row: any) => this.rowToExamPaper(row));
  },

  /** 将数据库行转换为 ExamPaper 对象 */
  rowToExamPaper(row: any): ExamPaper {
    return {
      id: row.id,
      userId: row.creator_id,
      title: row.title,
      description: row.description || '',
      totalScore: row.total_score || 100,
      difficultyDistribution: {},
      includeSolution: true,
      questionIds: row.question_ids || [],
      questionScores: row.question_scores || {},
      sectionTitles: row.section_titles || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async getById(id: string): Promise<ExamPaper | null> {
    const { data, error } = await supabase
      .from('exam_papers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.rowToExamPaper(data as any);
  },

  async create(data: ExamPaperFormData, _userId: string): Promise<ExamPaper> {
    const currentUser = await authApi.getCurrentUser();
    const questionIds = data.questions.map(q => q.questionId);
    const questionScores: Record<string, number> = {};
    const sectionTitles: Record<string, string> = {};

    for (const q of data.questions) {
      questionScores[q.questionId] = q.score;
      if (q.sectionTitle) sectionTitles[q.questionId] = q.sectionTitle;
    }

    const { data: inserted, error } = await supabase
      .from('exam_papers')
      .insert({
        title: data.title,
        description: data.description,
        creator_id: currentUser?.id,
        question_ids: questionIds,
        question_scores: questionScores,
        section_titles: sectionTitles,
        total_score: data.totalScore,
        status: 'draft',
        created_at: now(),
        updated_at: now(),
      } as any)
      .select()
      .single();

    if (error) throw error;

    const row = inserted as any;
    return {
      id: row.id,
      userId: row.creator_id,
      title: row.title,
      description: row.description || '',
      grade: '三年级',
      semester: '上册',
      textbookVersion: '人教版',
      totalScore: row.total_score || 100,
      difficultyDistribution: {},
      includeSolution: true,
      questionIds: row.question_ids || [],
      questionScores: row.question_scores || {},
      sectionTitles: row.section_titles || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async update(id: string, data: Partial<ExamPaperFormData>): Promise<ExamPaper | null> {
    const updateData: Record<string, unknown> = { updated_at: now() };

    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.questions) {
      updateData.question_ids = data.questions.map(q => q.questionId);
      const scores: Record<string, number> = {};
      const titles: Record<string, string> = {};
      for (const q of data.questions) {
        scores[q.questionId] = q.score;
        if (q.sectionTitle) titles[q.questionId] = q.sectionTitle;
      }
      updateData.question_scores = scores;
      updateData.section_titles = titles;
    }

    const { data: updated, error } = await supabase
      .from('exam_papers')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) return null;

    const row = updated as any;
    return {
      id: row.id,
      userId: row.creator_id,
      title: row.title,
      description: row.description || '',
      grade: '三年级',
      semester: '上册',
      textbookVersion: '人教版',
      totalScore: row.total_score || 100,
      difficultyDistribution: {},
      includeSolution: true,
      questionIds: row.question_ids || [],
      questionScores: row.question_scores || {},
      sectionTitles: row.section_titles || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('exam_papers').delete().eq('id', id);
    return !error;
  },
};
