const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, VerticalAlign,
  LevelFormat, convertInchesToTwip,
} = require('docx');
const fs = require('fs');

const JP = { ascii: 'MS PGothic', eastAsia: 'MS PGothic', hAnsi: 'MS PGothic' };
const NAVY = '1F4E79', BLUE = '2E75B6', GREY = '595959';
const C_RC = 'DEEBF7', C_S = 'E2EFDA', C_MX = 'FFF2CC', C_GD = 'FCE4D6';
const W = 9026; // 本文幅(DXA)

const t = (text, o = {}) => new TextRun({ text, font: JP, size: o.size || 21, bold: o.bold, color: o.color, italics: o.italics });
const p = (text, o = {}) => new Paragraph({
  alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 80, line: 300 },
  indent: o.indent, children: Array.isArray(text) ? text : [t(text, o)],
});

// 見出し（帯）
const h1 = (n, text) => new Paragraph({
  spacing: { before: 260, after: 120 },
  shading: { type: ShadingType.CLEAR, fill: NAVY },
  border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: NAVY } },
  children: [t(`  ${n}. ${text}`, { bold: true, color: 'FFFFFF', size: 24 })],
});

// 表セル
const cell = (text, o = {}) => new TableCell({
  width: { size: o.w, type: WidthType.DXA },
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
  verticalAlign: VerticalAlign.CENTER,
  margins: { top: 60, bottom: 60, left: 90, right: 90 },
  children: (Array.isArray(text) ? text : [text]).map((s) => new Paragraph({
    alignment: o.align || AlignmentType.CENTER,
    spacing: { before: 0, after: 0, line: 260 },
    children: [t(String(s), { size: o.size || 18, bold: o.bold, color: o.color })],
  })),
});

const table = (cols, rows) => new Table({
  columnWidths: cols,
  width: { size: cols.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'B4C6E7' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'B4C6E7' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'B4C6E7' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'B4C6E7' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'D6E0F0' },
    insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D6E0F0' },
  },
  rows,
});
const hrow = (cols, labels) => new TableRow({
  tableHeader: true,
  children: labels.map((l, i) => cell(l, { w: cols[i], fill: BLUE, bold: true, color: 'FFFFFF' })),
});

// ---------- 年間スケジュール ----------
const SC = [
  ['―', '9/17', '―', 'ガイダンス（趣旨説明・進め方・担当割当）', '両G合同', C_GD],
  ['1', '10/01', '③-1', 'RC造基本', '第二構造設計G', C_RC],
  ['2', '10/15', '③-2', 'S造基本', '第一構造設計G', C_S],
  ['3', '10/29', '④-1', 'RC造二次部材 ①', '第二構造設計G', C_RC],
  ['4', '11/12', '④-2', 'S造二次部材', '第一構造設計G', C_S],
  ['5', '11/26', '④-1', 'RC造二次部材 ②', '第二構造設計G', C_RC],
  ['6', '12/10', '⑤-2', 'S造上部構造 ①', '第一構造設計G', C_S],
  ['7', '12/24', '⑤-1', 'RC造上部構造 ①', '第二構造設計G', C_RC],
  ['8', '1/07', '⑤-2', 'S造上部構造 ②', '第一構造設計G', C_S],
  ['9', '1/21', '⑤-1', 'RC造上部構造 ②', '第二構造設計G', C_RC],
  ['10', '2/04', '⑥', '地盤基本・基礎構造 ①', '両G混合', C_MX],
  ['11', '2/18', '⑥', '地盤基本・基礎構造 ②', '両G混合', C_MX],
  ['12', '3/04', '⑨-2', 'S造監理（＋検査G 天野氏）', '第一構造設計G', C_S],
  ['13', '3/18', '⑨-1', 'RC造監理（＋監理G 宮嵜氏）', '第二構造設計G', C_RC],
];
const scCols = [700, 1100, 900, 3626, 2700];
const scRows = [hrow(scCols, ['回', '実施日', '区分', '解説項目', '担当'])];
SC.forEach((r) => scRows.push(new TableRow({
  children: [
    cell(r[0], { w: scCols[0], fill: r[5] }),
    cell(r[1], { w: scCols[1], fill: r[5] }),
    cell(r[2], { w: scCols[2], fill: r[5] }),
    cell(r[3], { w: scCols[3], align: AlignmentType.LEFT }),
    cell(r[4], { w: scCols[4], fill: r[5] }),
  ],
})));

// ---------- 実施概要 ----------
const ovCols = [2000, 7026];
const OV = [
  ['期間', '2026年9月17日（木）〜 2027年3月18日（木）'],
  ['頻度・曜日', '隔週 木曜日（全14回：ガイダンス1回＋勉強会13回）'],
  ['対象', '第一構造設計G・第二構造設計G の若手職員'],
  ['解説担当', '各回の解説は担当グループの若手職員が持ち回りで務める'],
  ['指導者', '担当者と同一グループの中堅職員が、資料作成と当日の補足を担当する'],
];
const ovRows = [hrow(ovCols, ['項目', '内容'])];
OV.forEach((r) => ovRows.push(new TableRow({
  children: [cell(r[0], { w: ovCols[0], fill: C_RC, bold: true }),
    cell(r[1], { w: ovCols[1], align: AlignmentType.LEFT })],
})));

// ---------- 1回の進め方 ----------
const fmCols = [2000, 1100, 5926];
const FM = [
  ['① 解説', '60分', '人材育成ガイドラインのスキルマップ項目を、担当グループの若手が解説する'],
  ['② 質疑・意見交換', '15分', '聞き手側のグループから質問し、両者で議論する'],
  ['③ 事例共有', '15分', '担当物件の概要、苦労した点、構造的に工夫した点、審査機関・施主の指摘対応、設計時・施工時の失敗事例や不具合事例を共有する'],
];
const fmRows = [hrow(fmCols, ['区分', '時間', '内容'])];
FM.forEach((r) => fmRows.push(new TableRow({
  children: [cell(r[0], { w: fmCols[0], fill: C_RC, bold: true }),
    cell(r[1], { w: fmCols[1] }),
    cell(r[2], { w: fmCols[2], align: AlignmentType.LEFT })],
})));

const bullet = (text, o = {}) => new Paragraph({
  numbering: { reference: 'dash', level: 0 },
  spacing: { before: 0, after: 70, line: 300 },
  children: [t(text, { size: o.size || 21 })],
});

const doc = new Document({
  numbering: {
    config: [{
      reference: 'dash',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '・', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 340, hanging: 240 } }, run: { font: JP } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1100, right: 1440, bottom: 1100, left: 1440 },
      },
    },
    children: [
      // タイトル
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [t('第一・第二構造設計G　若手合同勉強会　実施計画（案）', { bold: true, size: 30, color: NAVY })],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY } },
        children: [t('2026年　　月　　日／構造設計部', { size: 18, color: GREY })],
      }),

      h1(1, '背景'),
      p('人材育成ガイドラインでは、育成目標のひとつに「S造とRC造の両構造を経験することで組織および技術者としての対応力を強化する」ことを掲げている。'),
      p('一方で、両グループは構造形式ごとに業務が分かれており、若手が相手グループの構造形式に触れる機会は限られているのが現状である。そこで、ガイドラインの内容に沿って両グループの若手が相互に解説し合う合同勉強会を実施したい。'),

      h1(2, '目的'),
      bullet('グループ間の人材異動を円滑に進められるよう、互いの構造形式の設計の考え方と勘所について理解を深める。'),
      bullet('若手同士が率直に質問・意見交換できる関係を築き、グループ間の連携を強化する。'),
      bullet('若手が他者に説明する機会をつくり、自らの理解を確かなものにするとともに、説明力を高める。'),

      h1(3, 'カリキュラムの構成'),
      p('次の3つを柱とする。'),
      bullet('人材育成ガイドラインのRC造・S造に関する内容について、S造は第一構造設計Gが第二構造設計Gへ、RC造は第二構造設計Gが第一構造設計Gへ解説する。両グループが共通で用いる「地盤基本・基礎構造」は、両グループ混合で担当する。'),
      bullet('自身が担当した物件の概要、苦労した点、構造的に工夫した点、審査機関・施主の指摘対応、および設計時・施工時の失敗事例や不具合事例を共有する。'),
      bullet('検査G・監理Gのご協力をいただき、製品検査および配筋検査のチェックポイントを解説いただく。'),

      h1(4, '実施概要'),
      table(ovCols, ovRows),

      h1(5, '1回あたりの進め方（案）'),
      table(fmCols, fmRows),

      new Paragraph({ children: [t('')], spacing: { after: 0 } }),
      h1(6, '年間スケジュール'),
      table(scCols, scRows),
      new Paragraph({
        spacing: { before: 100, after: 60 },
        children: [t('※ 解説は第二構造設計G・第一構造設計Gが交互に担当する（⑥地盤基本・基礎構造の2回は両G混合のため対象外）。', { size: 17, color: GREY })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [t('※ 12/24・1/7 は年末年始に近接するため、業務状況により振替を検討する。', { size: 17, color: GREY })],
      }),

      h1(7, '期待する効果'),
      bullet('異動時に相手グループの構造形式へ早期に対応でき、立ち上がりが早くなる。'),
      bullet('失敗事例・不具合事例を組織で共有することで、同種の不具合の再発を防ぐ。'),
      bullet('作成した解説資料を蓄積し、次年度以降の教育資料として活用できる。'),
      bullet('若手が説明する経験を重ねることで、社内外への説明力が向上する。'),

      h1(8, 'ご相談事項'),
      bullet('検査G（天野氏）・監理G（宮嵜氏）へのご協力依頼について、ご調整をお願いしたい。'),
      bullet('開催時間帯および会場の確保について、ご承認をお願いしたい。'),
      bullet('各回の指導者となる中堅職員の配置について、ご相談させていただきたい。'),
      new Paragraph({
        spacing: { before: 200 },
        children: [t('以上', { size: 21 })],
        alignment: AlignmentType.RIGHT,
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.mkdirSync('docs/joint_study', { recursive: true });
  fs.writeFileSync('docs/joint_study/合同勉強会_実施計画.docx', buf);
  console.log('saved: docs/joint_study/合同勉強会_実施計画.docx');
});
