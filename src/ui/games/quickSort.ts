import { QUICK_SORT_CARDS, SORT_BUCKETS } from '../../data/science/s2_2c';
import { rapidSortGame } from './rapidSort';

/** "فرز سريع": infectious or not? 60 seconds, keys 1/2. */
export const quickSortGame = rapidSortGame({
  lesson: '2-2c',
  route: 'sort',
  title: 'فرز سريع ⚡',
  sub: 'معدٍ أم غير معدٍ؟ 60 ثانية. اضغط 1 أو 2.',
  intro: 'تظهر أمراض وحالات بسرعة: افرزها إلى معدٍ أو غير معدٍ قبل نفاد الوقت.',
  seconds: 60,
  buckets: SORT_BUCKETS,
  cards: QUICK_SORT_CARDS,
  scoreLabel: 'فرز صحيح',
  achievement: { id: 'sorter-25', at: 25 },
});
