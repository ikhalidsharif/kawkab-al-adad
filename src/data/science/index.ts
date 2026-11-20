import type { Generator, LessonId } from '../../core/question';
import { bankGenerators } from '../../science/bank';
import type { LearnContent } from '../../science/types';
import { bacteriaGrowth, bank2_2a, learn2_2a } from './s2_2a';
import { bank2_2b, deathData, learn2_2b } from './s2_2b';
import { bank2_2c, learn2_2c } from './s2_2c';
import { bank3_0, breathingRate, learn3_0 } from './s3_0';
import { bank3_1a, learn3_1a } from './s3_1a';
import { bank3_1b, learn3_1b, nutritionData } from './s3_1b';
import { bank3_2a, learn3_2a, respData } from './s3_2a';
import { bank3_2b, excretionData, learn3_2b } from './s3_2b';

export interface GameDef {
  route: string;
  title: string;
  desc: string;
}

export interface Station {
  id: LessonId;
  chapter: 2 | 3;
  title: string;
  /** Book pages, e.g. "53–55". */
  pages: string;
  available: boolean;
  generators: Generator[];
  learn?: LearnContent;
  game?: GameDef;
  extraGames?: GameDef[];
}

export const STATIONS: Station[] = [
  {
    id: '2-2a',
    chapter: 2,
    title: 'خطوط الدفاع والمناعة',
    pages: '53–55',
    available: true,
    generators: [...bankGenerators('2-2a', bank2_2a), bacteriaGrowth],
    learn: learn2_2a,
    game: { route: 'fortress', title: 'حصن الجسم', desc: 'مسببات المرض تهاجم من كل المنافذ — فعّل خط الدفاع المناسب قبل أن تخترقك!' },
  },
  {
    id: '2-2b',
    chapter: 2,
    title: 'الأمراض المعدية',
    pages: '56–58، 61–63',
    available: true,
    generators: [...bankGenerators('2-2b', bank2_2b), deathData],
    learn: learn2_2b,
    game: { route: 'koch', title: 'مختبر كوخ', desc: 'عيّنات تتدفق على مختبرك: حدّد مسبب كل مرض ورتّب خطوات كوخ قبل نفاد الوقت.' },
  },
  {
    id: '2-2c',
    chapter: 2,
    title: 'الأمراض غير المعدية',
    pages: '59–61',
    available: true,
    generators: bankGenerators('2-2c', bank2_2c),
    learn: learn2_2c,
    game: { route: 'sort', title: 'فرز سريع', desc: 'معدٍ أم غير معدٍ؟ افرز أكبر عدد من الأمراض والحالات في 60 ثانية.' },
  },
  {
    id: '3-0',
    chapter: 3,
    title: 'التهيئة',
    pages: '72–75',
    available: true,
    generators: [...bankGenerators('3-0', bank3_0), breathingRate],
    learn: learn3_0,
  },
  {
    id: '3-1a',
    chapter: 3,
    title: 'الجهاز الهضمي',
    pages: '76–80',
    available: true,
    generators: bankGenerators('3-1a', bank3_1a),
    learn: learn3_1a,
    game: { route: 'food', title: 'رحلة اللقمة', desc: 'اعبر القناة الهضمية محطة بعد محطة، وحدّد ما يحدث للطعام في كل عضو.' },
  },
  {
    id: '3-1b',
    chapter: 3,
    title: 'التغذية',
    pages: '80–85',
    available: true,
    generators: [...bankGenerators('3-1b', bank3_1b), nutritionData],
    learn: learn3_1b,
    game: { route: 'kitchen', title: 'مطبخ التوازن', desc: 'صنّف المواد الغذائية والأملاح ومجموعات الطعام، واقرأ البطاقة الغذائية بسرعة.' },
  },
  {
    id: '3-2a',
    chapter: 3,
    title: 'الجهاز التنفسي',
    pages: '86–91، 97',
    available: true,
    generators: [...bankGenerators('3-2a', bank3_2a), respData],
    learn: learn3_2a,
    game: { route: 'air', title: 'مسار الهواء', desc: 'اتبع جزيء الأكسجين من الأنف حتى الحويصلات الهوائية.' },
    extraGames: [{ route: 'breath', title: 'محاكي التنفس', desc: 'شهيق أم زفير؟ قرّر بسرعة مع كل تغيّر في الصدر والرئتين.' }],
  },
  {
    id: '3-2b',
    chapter: 3,
    title: 'الجهاز البولي والإخراج',
    pages: '91–96',
    available: true,
    generators: [...bankGenerators('3-2b', bank3_2b), excretionData],
    learn: learn3_2b,
    game: { route: 'filter', title: 'محطة التنقية', desc: 'افرز مكوّنات الدم في النفرون: يبقى أم يعود أم يُطرح؟ ووازن ماء الجسم.' },
    extraGames: [{ route: 'urine', title: 'مسار البول', desc: 'من الشريان الكلوي إلى خارج الجسم: اختر الممر الصحيح.' }],
  },
];
