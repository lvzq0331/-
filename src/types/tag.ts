// 标签类型定义

export type TagType = 'knowledge' | 'textbook' | 'difficulty' | 'question_type' | 'custom';

/** 标签实体 */
export interface Tag {
  id: string;
  type: TagType;
  name: string;
  parentId: string | null;
  children?: Tag[];
  sortOrder: number;
}

/** 知识点树节点 */
export interface KnowledgeNode extends Tag {
  type: 'knowledge';
  children: KnowledgeNode[];
}
