// 导出试卷为 Word (.docx) — 标准考试卷模板
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageOrientation, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import type { ExamPaper, Question } from '@/types';

const A4_W = 11900;
const A4_H = 16840;
const A3_LAND_W = 16840;
const A3_LAND_H = 11900;

export async function exportExamPaperToWord(
  paper: ExamPaper,
  questions: Question[],
  showAnswer: boolean = false,
  paperSize: 'a4' | 'a3' = 'a4'
): Promise<void> {
  const isA3 = paperSize === 'a3';
  return buildExamDoc(paper, questions, showAnswer, isA3);
}

async function buildExamDoc(
  paper: ExamPaper,
  questions: Question[],
  showAnswer: boolean,
  isA3: boolean
): Promise<void> {
  const children: Paragraph[] = [];
  const totalQ = questions.length;
  const fontSize = isA3 ? 22 : 21;
  const titleSize = isA3 ? 32 : 36;

  // ── 学校名 ──
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: '（学校）', size: Math.round(fontSize * 0.65), font: '宋体' })],
  }));

  // ── 试卷标题 ──
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: paper.title, size: titleSize, bold: true, font: '黑体' })],
  }));

  // ── 信息行：命题人 / 满分 / 考试时间 ──
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new TextRun({ text: '命题人：__________    满分：', size: Math.round(fontSize * 0.55), font: '宋体' }),
      new TextRun({ text: String(paper.totalScore), size: Math.round(fontSize * 0.55), bold: true, font: '宋体' }),
      new TextRun({ text: ' 分    考试时间：120 分钟', size: Math.round(fontSize * 0.55), font: '宋体' }),
    ],
  }));

  // ── 考生信息（居中） ──
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    children: [new TextRun({
      text: '姓名：____________    班级：____________    学号：____________    得分：____________',
      size: Math.round(fontSize * 0.8),
      font: '宋体',
    })],
  }));

  // ── 题目列表 ──
  questions.forEach((q, idx) => {
    const sc = paper.questionScores?.[q.id] || Math.floor(paper.totalScore / Math.max(totalQ, 1));
    const scoreStr = sc > 0 ? `（${sc}分）` : '';

    children.push(new Paragraph({
      spacing: { before: 120, after: 60 },
      children: [
        new TextRun({ text: `${idx + 1}.`, size: fontSize, bold: true, font: '宋体' }),
        new TextRun({ text: ` ${q.contentText}${scoreStr}`, size: fontSize, font: '宋体' }),
      ],
    }));

    // 选择题选项
    if (q.questionType === '选择题' && q.choiceOptions && q.choiceOptions.length > 0) {
      q.choiceOptions.forEach((opt: string, oi: number) => {
        children.push(new Paragraph({
          indent: { left: 360 },
          spacing: { after: 30 },
          children: [new TextRun({ text: `${String.fromCharCode(65 + oi)}. ${opt}`, size: Math.round(fontSize * 0.92), font: '宋体' })],
        }));
      });
    }

    // 填空题答题区
    if (q.questionType === '填空题') {
      children.push(new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: '答：_________________________________', size: Math.round(fontSize * 0.9), color: 'AAAAAA', font: '宋体' })],
      }));
    }

    // 解答题空白行
    if ((q.questionType === '解决问题' || q.questionType === '应用题') && !showAnswer) {
      for (let i = 0; i < 2; i++) {
        children.push(new Paragraph({ spacing: { after: 70 }, children: [new TextRun({ text: '', size: fontSize })] }));
      }
    }

    // 答案
    if (showAnswer) {
      children.push(new Paragraph({
        spacing: { before: 50, after: 60 },
        shading: { type: ShadingType.CLEAR, fill: 'F0FFF0' },
        children: [
          new TextRun({ text: `【答案】${q.answer}`, size: Math.round(fontSize * 0.85), bold: true, color: '006600', font: '宋体' }),
        ],
      }));
      if (q.solutionDetail) {
        children.push(new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: `【解析】${q.solutionDetail}`, size: Math.round(fontSize * 0.8), color: '0000AA', font: '宋体' })],
        }));
      }
    }
  });

  // ── 页脚 ──
  children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '第 1 页，共 1 页', size: 11, color: '999999', font: '宋体' })],
  }));

  // ── 创建文档 ──
  const doc = new Document({
    sections: [{
      properties: {
        page: isA3
          ? { width: A3_LAND_W, height: A3_LAND_H, orientation: PageOrientation.LANDSCAPE }
          : { width: A4_W, height: A4_H },
        margin: { top: 720, bottom: 720, left: 850, right: 850 },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${paper.title}.docx`);
}
