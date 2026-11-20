export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-correct', title: 'الانطلاق', desc: 'أول إجابة صحيحة', icon: '🚀' },
  { id: 'combo-10', title: 'سلسلة نارية', desc: '10 إجابات صحيحة متتالية', icon: '🔥' },
  { id: 'combo-25', title: 'لا يمكن إيقافه', desc: '25 إجابة صحيحة متتالية', icon: '⚡' },
  { id: 'perfect-practice', title: 'تدريب مثالي', desc: 'أنهى تدريباً بـ 8/8 من المحاولة الأولى', icon: '🎯' },
  { id: 'three-stars', title: 'ثلاث نجوم', desc: 'حصل على 3 نجوم في محطة', icon: '⭐' },
  { id: 'blitz-15', title: 'البرق', desc: '15 إجابة صحيحة في تحدٍّ سريع واحد', icon: '⏱️' },
  { id: 'fortress-20', title: 'حارس الحصن', desc: 'صدّ 20 هجوماً في لعبة حصن الجسم', icon: '🛡️' },
  { id: 'koch-15', title: 'عالم المختبر', desc: '15 عيّنة صحيحة في مختبر كوخ', icon: '🔬' },
  { id: 'sorter-25', title: 'الفارز السريع', desc: '25 فرزاً صحيحاً في لعبة الفرز السريع', icon: '⚡' },
  { id: 'immune-guard', title: 'خبير المناعة', desc: '3 نجوم في محطة خطوط الدفاع والمناعة', icon: '🧬' },
  { id: 'journey-food', title: 'دليل القناة الهضمية', desc: '11 إجابة صحيحة في رحلة اللقمة', icon: '🍔' },
  { id: 'kitchen-20', title: 'طاهي التوازن', desc: '20 إجابة صحيحة في مطبخ التوازن', icon: '🥗' },
  { id: 'journey-air', title: 'رحّالة الهواء', desc: '11 إجابة صحيحة في مسار الهواء', icon: '🌬️' },
  { id: 'filter-20', title: 'مهندس الكلية', desc: '20 قراراً صحيحاً في محطة التنقية', icon: '🧪' },
  { id: 'journey-urine', title: 'خبير المسار البولي', desc: '9 إجابات صحيحة في مسار البول', icon: '🚰' },
  { id: 'level-5', title: 'مستكشف صاعد', desc: 'وصل إلى المستوى 5', icon: '🛰️' },
  { id: 'level-10', title: 'قائد البعثة', desc: 'وصل إلى المستوى 10', icon: '🌌' },
  { id: 'notebook-5', title: 'يتعلّم من أخطائه', desc: 'نظّف 5 أسئلة من دفتر الأخطاء', icon: '📓' },
  { id: 'no-hints-ch2', title: 'بلا مساعدة', desc: 'أنهى الفصل 2 (كل المحطات والزعيم) بلا تلميحات', icon: '🧠' },
  { id: 'stars-ch2', title: 'نجم المناعة', desc: '3 نجوم في كل محطات الفصل 2', icon: '🌟' },
  { id: 'boss-2', title: 'قاهر سيّد العدوى', desc: 'هزم زعيم الفصل 2', icon: '👾' },
  { id: 'no-hints-ch3', title: 'عقل مستقل', desc: 'أنهى الفصل 3 (كل المحطات والزعيم) بلا تلميحات', icon: '🧩' },
  { id: 'stars-ch3', title: 'نجم الأجهزة', desc: '3 نجوم في كل محطات الفصل 3', icon: '💫' },
  { id: 'boss-3', title: 'قاهر حارس الأجهزة', desc: 'هزم زعيم الفصل 3', icon: '🏆' },
  { id: 'exam-done', title: 'التجربة الأولى', desc: 'أنهى امتحاناً تجريبياً كاملاً', icon: '📝' },
  { id: 'exam-90', title: 'جاهز للامتحان', desc: '90% أو أكثر في الامتحان التجريبي', icon: '🎓' },
];
