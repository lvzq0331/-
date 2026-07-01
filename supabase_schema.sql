-- 小学数学题库系统 - Supabase 数据库脚本
-- 在 Supabase 的 SQL Editor 中运行此脚本

-- 1. 用户表（扩展 Supabase Auth）
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  school TEXT,
  role TEXT DEFAULT 'collaborator' CHECK (role IN ('admin', 'collaborator')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 题目表
CREATE TABLE IF NOT EXISTS public.questions (
  id TEXT PRIMARY KEY DEFAULT 'q_' || gen_random_uuid(),
  creator_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  
  -- 题目内容
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'text+image')),
  content_text TEXT,
  content_images TEXT[], -- 数组存储多张图片的 base64
  
  -- 答案和解析
  answer TEXT,
  solution_hint TEXT,
  solution_detail TEXT,
  
  -- 分类信息
  grade TEXT,
  semester TEXT,
  textbook_version TEXT,
  unit TEXT,
  
  -- 题目属性
  knowledge_points TEXT[], -- 知识点数组
  question_type TEXT, -- 题型：填空题、选择题、应用题等
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  
  is_frequent_mistake BOOLEAN DEFAULT FALSE,
  mistake_rate INTEGER,
  source TEXT,
  sort_order INTEGER DEFAULT 0,
  
  -- 审核相关
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 试卷表
CREATE TABLE IF NOT EXISTS public.exam_papers (
  id TEXT PRIMARY KEY DEFAULT 'ep_' || gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES public.users(id),
  
  -- 试卷结构
  question_ids TEXT[], -- 题目 ID 数组
  question_scores JSONB, -- {"q_id1": 5, "q_id2": 10}
  section_titles JSONB, -- {"q_id1": "一、填空题"}
  
  total_score INTEGER,
  estimated_duration INTEGER, -- 分钟
  
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 标签/知识点树表
CREATE TABLE IF NOT EXISTS public.tags (
  id TEXT PRIMARY KEY DEFAULT 'tag_' || gen_random_uuid(),
  type TEXT DEFAULT 'knowledge',
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES public.tags(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- 设置访问策略（简化版：所有登录用户可读，仅创建者可写）
-- 题目：所有人可查看已发布的，协作者可管理自己的
CREATE POLICY "Published questions are visible to all" 
  ON public.questions FOR SELECT 
  USING (status = 'published' OR creator_id = auth.uid());

CREATE POLICY "Users can insert their own questions" 
  ON public.questions FOR INSERT 
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own pending/rejected questions" 
  ON public.questions FOR UPDATE 
  USING (creator_id = auth.uid() AND status IN ('pending', 'rejected'));

-- 试卷：仅创建者可管理
CREATE POLICY "Users can manage their own exam papers" 
  ON public.exam_papers FOR ALL 
  USING (creator_id = auth.uid());

-- 启用实时订阅（可选）
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_papers;

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_papers_updated_at BEFORE UPDATE ON public.exam_papers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初始管理员账号（可选，稍后通过注册功能创建）
-- INSERT INTO public.users (id, username, display_name, role)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'admin', '管理员', 'admin')
-- ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.questions IS '题目表';
COMMENT ON TABLE public.exam_papers IS '试卷表';
COMMENT ON TABLE public.users IS '用户扩展信息表';
COMMENT ON TABLE public.tags IS '知识点标签树';
