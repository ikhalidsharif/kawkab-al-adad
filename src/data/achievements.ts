export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-correct', title: 'الإقلاع', desc: 'أول إجابة صحيحة', icon: '🚀' },
  { id: 'combo-10', title: 'سلسلة نارية', desc: '10 إجابات صحيحة متتالية', icon: '🔥' },
  { id: 'combo-25', title: 'لا يمكن إيقافه', desc: '25 إجابة صحيحة متتالية', icon: '⚡' },
  { id: 'perfect-practice', title: 'تدريب مثالي', desc: 'أنهى تدريباً بـ 8/8 من المحاولة الأولى', icon: '🎯' },
  { id: 'three-stars', title: 'ثلاث نجوم', desc: 'حصل على 3 نجوم في محطة', icon: '⭐' },
  { id: 'blitz-15', title: 'البرق', desc: '15 إجابة صحيحة في تحدٍّ سريع واحد', icon: '⏱️' },
  { id: 'factory-20', title: 'مدير المصنع', desc: '20 صندوقاً في مصنع المقامات', icon: '🏭' },
  { id: 'level-5', title: 'رائد صاعد', desc: 'وصل إلى المستوى 5', icon: '🛰️' },
  { id: 'level-10', title: 'قائد الأسطول', desc: 'وصل إلى المستوى 10', icon: '🌌' },
  { id: 'notebook-5', title: 'يتعلّم من أخطائه', desc: 'نظّف 5 أسئلة من دفتر الأخطاء', icon: '📓' },
  { id: 'no-hints-ch2', title: 'بلا مساعدة', desc: 'أنهى الفصل 2 (كل المحطات والزعيم) بلا تلميحات', icon: '🧠' },
  { id: 'stars-ch2', title: 'نجم السديم', desc: '3 نجوم في كل محطات الفصل 2', icon: '🌟' },
  { id: 'boss-2', title: 'قاهر المدمّر الكسري', desc: 'هزم زعيم الفصل 2', icon: '👾' },
  { id: 'pythagoras', title: 'سيد فيثاغورس', desc: '3 نجوم في محطة نظرية فيثاغورس', icon: '📐' },
  { id: 'no-hints-ch3', title: 'عقل مستقل', desc: 'أنهى الفصل 3 (كل المحطات والزعيم) بلا تلميحات', icon: '🧩' },
  { id: 'stars-ch3', title: 'نجم المجرّة', desc: '3 نجوم في كل محطات الفصل 3', icon: '💫' },
  { id: 'boss-3', title: 'قاهر حارس الوتر', desc: 'هزم زعيم الفصل 3', icon: '🏆' },
  { id: 'exam-done', title: 'التجربة الأولى', desc: 'أنهى امتحاناً تجريبياً كاملاً', icon: '📝' },
  { id: 'exam-90', title: 'جاهز للامتحان', desc: '90% أو أكثر في الامتحان التجريبي', icon: '🎓' },
];
