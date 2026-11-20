import { FOOD_JOURNEY } from '../../data/science/s3_1a';
import { KITCHEN_CARDS } from '../../data/science/s3_1b';
import { AIR_JOURNEY, BREATH_CARDS } from '../../data/science/s3_2a';
import { FILTER_CARDS, URINE_JOURNEY } from '../../data/science/s3_2b';
import { journeyGame } from './journey';
import { rapidSortGame } from './rapidSort';

/** 3-1أ "رحلة اللقمة": follow a bite along the alimentary canal. */
export const foodJourneyGame = journeyGame({
  ...FOOD_JOURNEY,
  lesson: '3-1a',
  route: 'food',
  title: 'رحلة اللقمة 🍔',
  sub: 'اختر محطة اللقمة التالية، وحدّد ما يحدث في كل عضو. الأرقام 1–4.',
  intro: 'أنت لقمة طعام دخلت الفم للتو! اعبر القناة الهضمية محطة بعد محطة. انتبه: الأعضاء الملحقة لا يمر بها الطعام.',
});

/** 3-1ب "مطبخ التوازن": nutrients, minerals, food groups and label reading against the clock. */
export const kitchenGame = rapidSortGame({
  lesson: '3-1b',
  route: 'kitchen',
  title: 'مطبخ التوازن 🥗',
  sub: 'مادة غذائية؟ ملح معدني؟ مجموعة طعام؟ بطاقة بيانات؟ — 90 ثانية. الأرقام 1–4.',
  intro: 'أنت طاهي فريق رياضي: صنّف المكوّنات والوظائف بسرعة، واقرأ البطاقات الغذائية قبل نفاد الوقت.',
  seconds: 90,
  buckets: ['البروتينات', 'الكربوهيدرات', 'الدهون', 'الماء'],
  cards: KITCHEN_CARDS,
  scoreLabel: 'إجابات صحيحة',
  achievement: { id: 'kitchen-20', at: 20 },
});

/** 3-2أ "مسار الهواء": follow an oxygen molecule from the nose to the alveoli. */
export const airJourneyGame = journeyGame({
  ...AIR_JOURNEY,
  lesson: '3-2a',
  route: 'air',
  title: 'مسار الهواء 🌬️',
  sub: 'اتبع جزيء الأكسجين من الأنف إلى الحويصلات. الأرقام 1–4.',
  intro: 'أنت جزيء أكسجين على وشك الدخول من الأنف. اختر الممر الصحيح في كل مرة، وتعرّف ما يحدث فيه.',
});

/** 3-2أ "محاكي التنفس": inhale or exhale? */
export const breathGame = rapidSortGame({
  lesson: '3-2a',
  route: 'breath',
  title: 'محاكي التنفس 🫁',
  sub: 'شهيق أم زفير؟ 60 ثانية. اضغط 1 أو 2.',
  intro: 'تتوالى تغيّرات في الصدر والرئتين: قرّر بسرعة هل هي شهيق أم زفير.',
  seconds: 60,
  buckets: ['🫁 شهيق', '💨 زفير'],
  cards: BREATH_CARDS,
  scoreLabel: 'إجابات صحيحة',
  gameKey: 'breath',
});

/** 3-2ب "محطة التنقية": what happens to each blood component in the nephron, plus the water balance. */
export const filterGame = rapidSortGame({
  lesson: '3-2b',
  route: 'filter',
  title: 'محطة التنقية 🧪',
  sub: 'افرز مكوّنات الدم في النفرون، ووازن الماء في الجسم — 90 ثانية. الأرقام 1–3.',
  intro: 'أنت مشغّل محطة تنقية الدم في الكلية: قرّر مصير كل مكوّن، وحافظ على ميزان الماء.',
  seconds: 90,
  buckets: ['🩸 يبقى في الدم', '🔄 يعود إلى الدم', '🚽 يُطرح في البول'],
  cards: FILTER_CARDS,
  scoreLabel: 'قرارات صحيحة',
  achievement: { id: 'filter-20', at: 20 },
});

/** 3-2ب "مسار البول": from the renal artery out of the body. */
export const urineJourneyGame = journeyGame({
  ...URINE_JOURNEY,
  lesson: '3-2b',
  route: 'urine',
  title: 'مسار البول 🚰',
  sub: 'اتبع الفضلات من الدم حتى خروجها من الجسم. الأرقام 1–4.',
  intro: 'أنت جزيء فضلات في الدم يقترب من الكلية. أين تذهب بعد ذلك؟',
});
