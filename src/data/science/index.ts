import type { Generator, LessonId } from '../../core/question';
import { bankGenerators } from '../../science/bank';
import type { LearnContent } from '../../science/types';
import { bacteriaGrowth, bank2_2a, learn2_2a } from './s2_2a';

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
  { id: '2-2b', chapter: 2, title: 'الأمراض المعدية', pages: '56–59، 62–63', available: false, generators: [] },
  { id: '2-2c', chapter: 2, title: 'الأمراض غير المعدية', pages: '59–61', available: false, generators: [] },
  { id: '3-0', chapter: 3, title: 'التهيئة', pages: '72–75', available: false, generators: [] },
  { id: '3-1a', chapter: 3, title: 'الجهاز الهضمي', pages: '76–80', available: false, generators: [] },
  { id: '3-1b', chapter: 3, title: 'التغذية', pages: '80–85', available: false, generators: [] },
  { id: '3-2a', chapter: 3, title: 'الجهاز التنفسي', pages: '86–91، 97', available: false, generators: [] },
  { id: '3-2b', chapter: 3, title: 'الجهاز البولي والإخراج', pages: '91–96', available: false, generators: [] },
];
