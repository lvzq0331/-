// 导出试卷为 PDF
import jsPDF from 'jspdf';
import type { ExamPaper, Question } from '@/types';

export async function exportExamPaperToPDF(
  paper: ExamPaper,
  questions: Question[],
  showAnswer: boolean = false
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // 标题
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(paper.title, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // 试卷信息
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${paper.grade} ${paper.semester}  ${paper.textbookVersion}  共${questions.length}题  总分${paper.totalScore}分`,
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  y += 8;

  if (paper.description) {
    doc.setFontSize(9);
    doc.text(paper.description, pageWidth / 2, y, { align: 'center' });
    y += 8;
  }

  // 分隔线
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // 注意事项
  doc.setFontSize(9);
  doc.text('姓名：___________  班级：___________  学号：___________  得分：___________', margin, y);
  y += 10;

  // 题目
  questions.forEach((q, idx) => {
    const score = paper.questionScores?.[q.id] || Math.floor(paper.totalScore / questions.length);

    // 检查是否需要换页
    if (y > 270) {
      doc.addPage();
      y = margin;
    }

    // 题号 + 内容
    const questionText = `${idx + 1}. ${q.contentText}（${score}分）`;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    // 自动换行
    const lines = doc.splitTextToSize(questionText, contentWidth);
    lines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 6;
    });

    // 选择题选项
    if (q.questionType === '选择题' && q.choiceOptions && q.choiceOptions.length > 0) {
      q.choiceOptions.forEach((opt: string, oi: number) => {
        if (y > 280) { doc.addPage(); y = margin; }
        doc.text(`    ${String.fromCharCode(65 + oi)}. ${opt}`, margin + 5, y);
        y += 5;
      });
    }

    // 填空题
    if (q.questionType === '填空题') {
      if (y > 280) { doc.addPage(); y = margin; }
      doc.text('答：_________________________________', margin + 5, y);
      y += 7;
    }

    // 解答题空白区域
    if (q.questionType === '解决问题' || q.questionType === '应用题') {
      for (let i = 0; i < 4; i++) {
        if (y > 280) { doc.addPage(); y = margin; }
        doc.line(margin + 5, y, pageWidth - margin - 5, y);
        y += 7;
      }
    }

    y += 2;

    // 答案
    if (showAnswer) {
      if (y > 275) { doc.addPage(); y = margin; }
      doc.setFontSize(9);
      doc.setTextColor(0, 100, 0);
      doc.text(`【答案】${q.answer}`, margin + 5, y);
      y += 5;
      if (q.solutionDetail) {
        doc.setTextColor(0, 0, 170);
        const solLines = doc.splitTextToSize(`【解析】${q.solutionDetail}`, contentWidth - 10);
        solLines.forEach((line: string) => {
          if (y > 280) { doc.addPage(); y = margin; }
          doc.text(line, margin + 5, y);
          y += 5;
        });
      }
      doc.setTextColor(0, 0, 0);
      y += 3;
    }
  });

  // 页脚
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(170, 170, 170);
    doc.text(`— 由小学数学题库系统生成 — 第 ${i} 页 / 共 ${pageCount} 页`, pageWidth / 2, 290, { align: 'center' });
  }

  doc.save(`${paper.title}.pdf`);
}
