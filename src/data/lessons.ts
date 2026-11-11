import type { LessonId } from '../core/question';
import type { MixEntry } from '../generators';
import type { LearnContent } from './learnTypes';
import { learn2_5 } from './learn/l2_5';
import { learn2_6 } from './learn/l2_6';
import { learn2_7 } from './learn/l2_7';
import { learn2_8 } from './learn/l2_8';
import { learn2_9 } from './learn/l2_9';
import { learn3_0, learn3_1, learn3_2, learn3_3, learn3_4, learn3_5, learn3_6, learn3_ext } from './learn/chapter3';

export interface GameDef {
  route: string;
  title: string;
  desc: string;
}

export interface LessonDef {
  id: LessonId;
  chapter: 2 | 3;
  title: string;
  page: number;
  /** False until the station is built; shown as "قريباً" on the map. */
  available: boolean;
  mix: MixEntry[];
  learn?: LearnContent;
  game?: GameDef;
  /** Additional mini-games (shown as extra cards on the station). */
  extraGames?: GameDef[];
}

export const LESSONS: LessonDef[] = [
  {
    id: '2-5',
    chapter: 2,
    title: 'جمع الأعداد النسبية وطرحها',
    page: 57,
    available: true,
    mix: [
      { gen: '2-5/same-den', weight: 2 },
      { gen: '2-5/diff-den', weight: 3 },
      { gen: '2-5/mixed', weight: 3 },
      { gen: '2-5/word', weight: 2 },
      { gen: '2-5/lcd', weight: 1 },
    ],
    learn: learn2_5,
    game: { route: 'factory', title: 'مصنع المقامات', desc: 'اختر م.م.أ الصحيح قبل أن يمر الصندوق!' },
  },
  {
    id: '2-6',
    chapter: 2,
    title: 'حل معادلات تتضمن أعداداً نسبية',
    page: 63,
    available: true,
    mix: [
      { gen: '2-6/add-sub', weight: 3 },
      { gen: '2-6/mul', weight: 3 },
      { gen: '2-6/word', weight: 2 },
      { gen: '2-6/write-eq', weight: 1 },
    ],
    learn: learn2_6,
    game: { route: 'balance', title: 'الميزان', desc: 'طبّق العملية نفسها على الكفتين حتى تعزل س.' },
  },
  {
    id: '2-7',
    chapter: 2,
    title: 'خطة حل المسألة: البحث عن نمط',
    page: 67,
    available: true,
    mix: [
      { gen: '2-7/arith', weight: 3 },
      { gen: '2-7/geom', weight: 2 },
      { gen: '2-7/quad', weight: 2 },
      { gen: '2-7/rule', weight: 1 },
      { gen: '2-7/word', weight: 2 },
    ],
    learn: learn2_7,
    game: { route: 'code', title: 'اكسر الشيفرة', desc: 'أكمل الأرقام المفقودة في النمط لتفتح الخزنة.' },
  },
  {
    id: '2-8',
    chapter: 2,
    title: 'القوى والأسس',
    page: 69,
    available: true,
    mix: [
      { gen: '2-8/write', weight: 1 },
      { gen: '2-8/evaluate', weight: 3 },
      { gen: '2-8/order-ops', weight: 2 },
      { gen: '2-8/substitute', weight: 2 },
      { gen: '2-8/true-false', weight: 1 },
      { gen: '2-8/piggy', weight: 1 },
    ],
    learn: learn2_8,
    game: { route: 'piggy', title: 'الحصالة المضاعفة', desc: 'توقّع ما في الحصالة، ثم طابق كل قوة مع قيمتها.' },
  },
  {
    id: '2-9',
    chapter: 2,
    title: 'الصيغة العلمية',
    page: 73,
    available: true,
    mix: [
      { gen: '2-9/to-sci', weight: 3 },
      { gen: '2-9/to-std', weight: 3 },
      { gen: '2-9/compare', weight: 2 },
      { gen: '2-9/order', weight: 1 },
    ],
    learn: learn2_9,
    game: { route: 'ruler', title: 'مسطرة الكون', desc: 'رتّب أجسام الكون حسب حجمها، وحرّك الفاصلة العشرية.' },
  },
  {
    id: '3-0',
    chapter: 3,
    title: 'التهيئة',
    page: 79,
    available: true,
    mix: [
      { gen: '3-0/squares', weight: 3 },
      { gen: '3-0/order', weight: 2 },
      { gen: '3-0/substitute', weight: 2 },
    ],
    learn: learn3_0,
  },
  {
    id: '3-1',
    chapter: 3,
    title: 'الجذور التربيعية',
    page: 80,
    available: true,
    mix: [
      { gen: '3-1/sqrt', weight: 3 },
      { gen: '3-1/equation', weight: 3 },
      { gen: '3-1/tiles', weight: 2 },
      { gen: '3-1/meaning', weight: 1 },
    ],
    learn: learn3_1,
    game: { route: 'tiles', title: 'مربع البلاط', desc: 'ابنِ مربعاً من البلاطات لتجد الجذر، ثم جولة سرعة للمربعات الكاملة.' },
  },
  {
    id: '3-2',
    chapter: 3,
    title: 'تقدير الجذور التربيعية',
    page: 83,
    available: true,
    mix: [
      { gen: '3-2/between', weight: 2 },
      { gen: '3-2/nearest', weight: 3 },
      { gen: '3-2/compare', weight: 2 },
      { gen: '3-2/word', weight: 1 },
    ],
    learn: learn3_2,
    game: { route: 'line', title: 'خط الأعداد', desc: 'ضع الجذر في مكانه الصحيح على خط الأعداد — كلما اقتربت زادت النقاط.' },
  },
  {
    id: '3-3',
    chapter: 3,
    title: 'خطة حل المسألة: الحل العكسي',
    page: 86,
    available: true,
    mix: [
      { gen: '3-3/chain', weight: 3 },
      { gen: '3-3/fuel', weight: 2 },
    ],
    learn: learn3_3,
    game: { route: 'time', title: 'آلة الزمن', desc: 'ارجع خطوة خطوة عبر سلسلة العمليات حتى تصل إلى العدد الأصلي.' },
  },
  {
    id: '3-4',
    chapter: 3,
    title: 'نظام الأعداد الحقيقية',
    page: 88,
    available: true,
    mix: [
      { gen: '3-4/classify', weight: 3 },
      { gen: '3-4/rational', weight: 2 },
      { gen: '3-4/order', weight: 2 },
      { gen: '3-4/compare', weight: 2 },
    ],
    learn: learn3_4,
    game: { route: 'sort', title: 'الفرز', desc: 'وجّه كل عدد إلى مجموعته في مخطط فن قبل أن يسقط!' },
  },
  {
    id: '3-5',
    chapter: 3,
    title: 'نظرية فيثاغورس',
    page: 92,
    available: true,
    mix: [
      { gen: '3-5/hyp', weight: 3 },
      { gen: '3-5/leg', weight: 3 },
      { gen: '3-5/converse', weight: 2 },
      { gen: '3-5/word', weight: 2 },
    ],
    learn: learn3_5,
    game: { route: 'lab', title: 'مختبر فيثاغورس', desc: 'حرّك ساقي المثلث وشاهد مساحات المربعات تتغيّر.' },
    extraGames: [
      { route: 'rescue', title: 'مهمة الإنقاذ', desc: 'اختر بُعد قاعدة السلّم ليصل إلى النافذة.' },
      { route: 'right', title: 'قائم أم لا؟', desc: '30 ثانية: احكم على أكبر عدد من المثلثات.' },
    ],
  },
  {
    id: '3-ext',
    chapter: 3,
    title: 'توسع: تمثيل الأعداد غير النسبية',
    page: 99,
    available: true,
    mix: [
      { gen: '3-ext/legs', weight: 3 },
      { gen: '3-ext/value', weight: 3 },
      { gen: '3-2/between', weight: 1 },
    ],
    learn: learn3_ext,
    game: { route: 'compass', title: 'الفرجار', desc: 'اختر ساقين صحيحتين لتنشئ الجذر المطلوب على خط الأعداد.' },
  },
  {
    id: '3-6',
    chapter: 3,
    title: 'هندسة: المسافات في المستوى الإحداثي',
    page: 100,
    available: true,
    mix: [
      { gen: '3-6/distance', weight: 4 },
      { gen: '3-6/legs', weight: 1 },
    ],
    learn: learn3_6,
    game: { route: 'radar', title: 'الرادار', desc: 'اضغط هدفين على شبكة الرادار ثم احسب المسافة بينهما.' },
  },
];

export interface BossDef {
  chapter: 2 | 3;
  name: string;
  /** Mixed questions from every lesson of the chapter (plus chapter-test extras). */
  mix: MixEntry[];
  available: boolean;
}

export const REGIONS = [
  { chapter: 2 as const, name: 'سديم الأعداد النسبية', sub: 'الفصل 2: الأعداد النسبية (ص 57–77)', boss: 'المدمّر الكسري' },
  { chapter: 3 as const, name: 'مجرّة فيثاغورس', sub: 'الفصل 3: الأعداد الحقيقية ونظرية فيثاغورس (ص 79–104)', boss: 'حارس الوتر' },
];

export const BOSSES: BossDef[] = [
  {
    chapter: 2,
    name: 'المدمّر الكسري',
    available: true,
    mix: [
      { gen: 'boss2/to-decimal', weight: 2 },
      { gen: '2-5/diff-den', weight: 2 },
      { gen: '2-5/mixed', weight: 2 },
      { gen: '2-6/add-sub', weight: 2 },
      { gen: '2-6/mul', weight: 2 },
      { gen: '2-6/word', weight: 1 },
      { gen: '2-7/arith', weight: 1 },
      { gen: '2-7/word', weight: 1 },
      { gen: '2-8/evaluate', weight: 2 },
      { gen: '2-8/order-ops', weight: 1 },
      { gen: '2-9/to-sci', weight: 2 },
      { gen: '2-9/compare', weight: 1 },
    ],
  },
  {
    chapter: 3,
    name: 'حارس الوتر',
    available: true,
    mix: [
      { gen: '3-1/sqrt', weight: 2 },
      { gen: '3-1/equation', weight: 2 },
      { gen: '3-2/nearest', weight: 2 },
      { gen: '3-2/compare', weight: 1 },
      { gen: '3-3/chain', weight: 1 },
      { gen: '3-3/fuel', weight: 1 },
      { gen: '3-4/classify', weight: 2 },
      { gen: '3-4/order', weight: 1 },
      { gen: '3-5/hyp', weight: 2 },
      { gen: '3-5/leg', weight: 2 },
      { gen: '3-5/converse', weight: 1 },
      { gen: '3-5/word', weight: 2 },
      { gen: '3-ext/value', weight: 1 },
      { gen: '3-6/distance', weight: 2 },
    ],
  },
];

export function getBoss(chapter: number): BossDef | undefined {
  return BOSSES.find((b) => b.chapter === chapter);
}

export function getLesson(id: string): LessonDef | undefined {
  return LESSONS.find((l) => l.id === id);
}
