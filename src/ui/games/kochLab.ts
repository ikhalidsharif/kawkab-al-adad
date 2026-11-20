import { KOCH_BUCKETS, KOCH_CARDS } from '../../data/science/s2_2b';
import { rapidSortGame } from './rapidSort';

/** "مختبر كوخ": identify the pathogen behind each disease, and place lab scenes in Koch's postulates (90 s). */
export const kochLabGame = rapidSortGame({
  lesson: '2-2b',
  route: 'koch',
  title: 'مختبر كوخ 🔬',
  sub: 'حدّد مسبب كل مرض، ورتّب خطوات كوخ — 90 ثانية. الأرقام 1–4.',
  intro: 'أنت باحث في مختبر الأمراض: عيّنات تصل بسرعة. حدّد المسبب، وتعرّف خطوة كوخ في كل تجربة.',
  seconds: 90,
  buckets: KOCH_BUCKETS,
  cards: KOCH_CARDS,
  scoreLabel: 'عيّنات صحيحة',
  achievement: { id: 'koch-15', at: 15 },
});
