import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import { texBoth, texFrac } from '../core/mathutil';
import type { Generator } from '../core/question';
import type { Rng } from '../core/rng';
import { X, Y } from './util';
import { evalExact } from '../core/expr';

const PH = 'العدد، مثال: 81 أو ‎-1/8‎';
const pow = (b: Fraction, e: number) => b.pow(e);
const pTex = (b: number) => (b < 0 ? `(${b})` : `${b}`);

/* ---------- 1. Write as a power (multiple choice) ---------- */
export const write: Generator = {
  id: '2-8/write',
  lesson: '2-8',
  label: 'الكتابة بالصيغة الأسية',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    let product: string;
    let correct: string;
    let distract: string[];
    let expl: string;
    if (d === 1) {
      const b = rng.int(2, 9);
      const n = rng.int(3, 6);
      product = Array(n).fill(b).join(' \\times ');
      correct = `${b}^{${n}}`;
      distract = [`${n}^{${b}}`, `${b} \\times ${n}`, `${b * n}`];
      expl = `العدد $${b}$ (الأساس) مضروب في نفسه $${n}$ مرات (الأس).`;
    } else if (d === 2) {
      const a = rng.int(2, 4);
      const b = rng.int(1, 3);
      const k = rng.int(2, 7);
      product = [k, ...Array(a).fill(X), ...Array(b).fill(Y)].join(' \\cdot ');
      const yPart = b === 1 ? Y : `${Y}^{${b}}`;
      correct = `${k}${X}^{${a}}${yPart}`;
      distract = [`${k}${X}${Y}^{${a + b}}`, `${k}^{${a}}${X}${yPart}`, `${k}(${X}${Y})^{${a + b}}`, `${k}${X}^{${b}}${Y}^{${a}}`];
      expl = `$${X}$ تكرّرت $${a}$ مرات، و$${Y}$ تكرّرت $${b}$ ${b === 1 ? 'مرة' : 'مرات'}، والعدد $${k}$ يبقى معاملاً.`;
    } else if (rng.chance(0.6)) {
      const b = -rng.int(2, 5);
      const n = rng.int(3, 5);
      product = Array(n).fill(`(${b})`).join('');
      correct = `(${b})^{${n}}`;
      distract = [`${b}^{${n}}`, `${n}^{${b}}`, `(${-b})^{${n}}`];
      expl = `الأساس هو العدد السالب كاملاً $(${b})$ لذا نضعه بين قوسين. لاحظ أن $${b}^{${n}}$ تعني $-(${-b}^{${n}})$.`;
    } else {
      const q = rng.int(2, 5);
      const n = rng.int(2, 4);
      product = Array(n).fill(`\\frac{1}{${q}}`).join(' \\cdot ');
      correct = `\\left(\\frac{1}{${q}}\\right)^{${n}}`;
      distract = [`\\frac{1}{${q}^{-${n}}}`, `\\frac{${n}}{${q}}`, `\\frac{1^{${n}}}{${q}}`];
      expl = `الأساس هو الكسر $\\frac{1}{${q}}$ مضروباً في نفسه $${n}$ مرات.`;
    }
    const { choices, index } = makeChoices(rng, `$${correct}$`, distract.map((x) => `$${x}$`));
    return {
      prompt: `اكتب بالصيغة الأسية: $$${product}$$`,
      answer: { kind: 'choice', index },
      choices,
      answerTex: correct,
      hints: ['عُدّ كم مرة تكرّر كل عامل: هذا هو الأس.'],
      solution: [expl, `$${product} = ${correct}$`],
      meta: { product, correct },
    };
  },
};

/* ---------- 2. Evaluate a power (incl. negative base, zero and negative exponents) ---------- */
export const evaluate: Generator = {
  id: '2-8/evaluate',
  lesson: '2-8',
  label: 'حساب قيمة القوى',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    let tex: string;
    let value: Fraction;
    let steps: string[];
    let js: string;
    if (d === 1) {
      const b = rng.int(2, 10);
      const n = b === 10 ? rng.int(2, 5) : b <= 3 ? rng.int(3, 6) : rng.int(2, 3);
      value = pow(new Fraction(b), n);
      tex = `${b}^{${n}}`;
      js = `${b}**${n}`;
      steps = [`$${tex} = ${Array(n).fill(b).join(' \\times ')} = ${value}$`];
    } else if (d === 2) {
      const type = rng.int(0, 3);
      const a = rng.int(2, 5);
      const n = rng.int(2, 4);
      if (type === 0) {
        value = pow(new Fraction(-a), n);
        tex = `(-${a})^{${n}}`;
        js = `(-${a})**${n}`;
        steps = [`الأساس $(-${a})$ والأس $${n}$: $${Array(n).fill(`(-${a})`).join('')} = ${value}$`, n % 2 === 0 ? 'الأس زوجي ← الناتج موجب.' : 'الأس فردي ← الناتج سالب.'];
      } else if (type === 1) {
        value = pow(new Fraction(a), n).neg();
        tex = `-${a}^{${n}}`;
        js = `-(${a}**${n})`;
        steps = [`الأس يخص العدد $${a}$ فقط وليس الإشارة: $-${a}^{${n}} = -(${Array(n).fill(a).join(' \\times ')})$`, `$= ${value}$ (انتبه: $(-${a})^{${n}} \\neq -${a}^{${n}}$ ${n % 2 === 0 ? 'هنا' : 'عموماً'})`];
      } else if (type === 2) {
        const b = rng.pick([7, 13, 25, -4, -9, 100]);
        value = new Fraction(1);
        tex = `${pTex(b)}^{0}`;
        js = `(${b})**0`;
        steps = [`الأس الصفري: أي عدد غير الصفر مرفوع للأس $0$ يساوي $1$: $${tex} = 1$`];
      } else {
        const b = rng.pick([6, 8, 15]);
        value = new Fraction(-1);
        tex = `-${b}^{0}`;
        js = `-(${b}**0)`;
        steps = [`الأس يخص $${b}$ فقط: $-${b}^{0} = -(${b}^{0}) = -1$`];
      }
    } else {
      const type = rng.int(0, 3);
      const n = rng.int(1, 3);
      if (type === 0) {
        const b = rng.int(2, 5);
        value = pow(new Fraction(b), -n);
        tex = `${b}^{-${n}}`;
        js = `${b}**(-${n})`;
        steps = [`الأس السالب: $${tex} = \\frac{1}{${b}^{${n}}}$`, `$= ${texFrac(value)}$`];
      } else if (type === 1) {
        const b = rng.int(2, 4);
        const m = rng.pick([1, 3]);
        value = pow(new Fraction(-b), -m);
        tex = `(-${b})^{-${m}}`;
        js = `(-${b})**(-${m})`;
        steps = [`$${tex} = \\frac{1}{(-${b})^{${m}}}$`, `$= \\frac{1}{${pow(new Fraction(-b), m)}} = ${texFrac(value)}$`];
      } else if (type === 2) {
        const k = rng.int(1, 4);
        value = pow(new Fraction(10), -k);
        tex = `10^{-${k}}`;
        js = `10**(-${k})`;
        steps = [`$${tex} = \\frac{1}{10^{${k}}} = ${texFrac(value)}$ (أي $${value.toString()}$)`];
      } else {
        const q = rng.int(2, 5);
        const m = rng.int(2, 3);
        value = pow(new Fraction(1, q), -m);
        tex = `\\left(\\frac{1}{${q}}\\right)^{-${m}}`;
        js = `(1/${q})**(-${m})`;
        steps = [`الأس السالب يقلب الكسر: $${tex} = ${q}^{${m}}$`, `$= ${value}$`];
      }
    }
    return {
      prompt: `احسب قيمة: $$${tex}$$`,
      answer: { kind: 'fraction', value, requireSimplest: true },
      answerTex: texBoth(value),
      hints: [
        d === 3 ? 'الأس السالب: $\\text{أ}^{-n} = \\frac{1}{\\text{أ}^{n}}$' : d === 2 ? 'هل الإشارة السالبة داخل الأقواس (جزء من الأساس) أم خارجها؟' : 'اضرب الأساس في نفسه بعدد مرات الأس.',
      ],
      solution: steps,
      placeholder: PH,
      meta: { js },
    };
  },
};

/* ---------- 3. Order of operations with powers ---------- */
export const orderOps: Generator = {
  id: '2-8/order-ops',
  lesson: '2-8',
  label: 'ترتيب العمليات مع الأسس',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const a = rng.int(2, 9);
    const b = rng.int(2, 4);
    const c = rng.int(2, 6);
    let tex: string;
    let js: string;
    let steps: string[];
    const t = rng.int(0, 2);
    if (d === 1) {
      if (t === 0) {
        tex = `${a} + ${b}^{2} \\times ${c}`;
        js = `${a} + ${b}**2 * ${c}`;
        steps = [`الأسس أولاً: $${b}^{2} = ${b * b}$`, `ثم الضرب: $${b * b} \\times ${c} = ${b * b * c}$`, `ثم الجمع: $${a} + ${b * b * c} = ${a + b * b * c}$`];
      } else if (t === 1) {
        tex = `${c} \\times ${b}^{3} - ${a}`;
        js = `${c} * ${b}**3 - ${a}`;
        steps = [`الأسس أولاً: $${b}^{3} = ${b ** 3}$`, `ثم الضرب: $${c} \\times ${b ** 3} = ${c * b ** 3}$`, `ثم الطرح: $${c * b ** 3} - ${a} = ${c * b ** 3 - a}$`];
      } else {
        tex = `${a}^{2} - ${b}^{2}`;
        js = `${a}**2 - ${b}**2`;
        steps = [`$${a}^{2} = ${a * a}$ و $${b}^{2} = ${b * b}$`, `$${a * a} - ${b * b} = ${a * a - b * b}$`];
      }
    } else if (d === 2) {
      if (t === 0) {
        tex = `(${a} - ${b + a})^{2} + ${c}`;
        js = `(${a} - ${b + a})**2 + ${c}`;
        steps = [`الأقواس أولاً: $${a} - ${a + b} = ${-b}$`, `ثم الأس: $(${-b})^{2} = ${b * b}$`, `ثم الجمع: $${b * b} + ${c} = ${b * b + c}$`];
      } else if (t === 1) {
        tex = `${c} (-${b})^{3} + ${a}`;
        js = `${c} * (-${b})**3 + ${a}`;
        steps = [`الأس أولاً: $(-${b})^{3} = ${-(b ** 3)}$`, `ثم الضرب: $${c} \\times (${-(b ** 3)}) = ${-c * b ** 3}$`, `ثم الجمع: $${-c * b ** 3} + ${a} = ${-c * b ** 3 + a}$`];
      } else {
        tex = `\\frac{${b}^{4}}{${b}^{2}} - ${a}^{0}`;
        js = `${b}**4 / ${b}**2 - ${a}**0`;
        steps = [`$${b}^{4} = ${b ** 4}$ و $${b}^{2} = ${b * b}$ و $${a}^{0} = 1$`, `$\\frac{${b ** 4}}{${b * b}} - 1 = ${b * b} - 1 = ${b * b - 1}$`];
      }
    } else {
      if (t === 0) {
        const k = 4 * rng.int(2, 9);
        tex = `${k} \\times 2^{-2} + ${c}`;
        js = `${k} * 2**(-2) + ${c}`;
        steps = [`$2^{-2} = \\frac{1}{4}$`, `$${k} \\times \\frac{1}{4} = ${k / 4}$`, `$${k / 4} + ${c} = ${k / 4 + c}$`];
      } else if (t === 1) {
        tex = `(-2)^{${b + 1}} - ${a}^{0} \\times ${c}`;
        js = `(-2)**${b + 1} - ${a}**0 * ${c}`;
        const p = (-2) ** (b + 1);
        steps = [`$(-2)^{${b + 1}} = ${p}$ و $${a}^{0} = 1$`, `$${p} - 1 \\times ${c} = ${p} - ${c} = ${p - c}$`];
      } else {
        const k = 10 * rng.int(2, 9);
        tex = `${k} \\times 10^{-1} - ${b}^{2}`;
        js = `${k} * 10**(-1) - ${b}**2`;
        steps = [`$10^{-1} = \\frac{1}{10}$ و $${b}^{2} = ${b * b}$`, `$${k} \\times \\frac{1}{10} = ${k / 10}$`, `$${k / 10} - ${b * b} = ${k / 10 - b * b}$`];
      }
    }
    const value = evalExact(js);
    return {
      prompt: `احسب قيمة العبارة: $$${tex}$$`,
      answer: { kind: 'fraction', value, requireSimplest: true },
      answerTex: texBoth(value),
      hints: ['ترتيب العمليات: الأقواس ← الأسس ← الضرب والقسمة ← الجمع والطرح.'],
      solution: steps,
      placeholder: PH,
      meta: { js },
    };
  },
};

/* ---------- 4. Evaluate algebraic expressions by substitution ---------- */
export const substitute: Generator = {
  id: '2-8/substitute',
  lesson: '2-8',
  label: 'التعويض في العبارات الجبرية',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const x = d === 1 ? rng.int(2, 5) : rng.pick([-3, -2, 2, 3, 4, -1]);
    const y = d === 1 ? rng.int(1, 6) : rng.pick([-4, -2, 1, 3, 5]);
    const templates: [string, (x: string, y: string) => string][][] = [
      [
        [`${X}^{2} + ${Y}`, (x, y) => `${x}**2 + ${y}`],
        [`2${X}^{3}`, (x) => `2 * ${x}**3`],
        [`${X}^{3} - ${Y}`, (x, y) => `${x}**3 - ${y}`],
      ],
      [
        [`${X}^{2} - ${Y}^{2}`, (x, y) => `${x}**2 - ${y}**2`],
        [`(${X} + ${Y})^{2}`, (x, y) => `(${x} + ${y})**2`],
        [`3${X}^{2} - 2${Y}`, (x, y) => `3 * ${x}**2 - 2 * ${y}`],
      ],
      [
        [`${X}^{-2}`, (x) => `${x}**(-2)`],
        [`${Y}^{0} + ${X}^{3}`, (x, y) => `${y}**0 + ${x}**3`],
        [`${X}^{-1} + ${Y}^{2}`, (x, y) => `${x}**(-1) + ${y}**2`],
      ],
    ];
    const [tex, f] = rng.pick(templates[d - 1]);
    const js = f(`(${x})`, `(${y})`);
    const value = evalExact(js);
    const sub = tex.replace(/\\text\{س\}/g, `(${x})`).replace(/\\text\{ص\}/g, `(${y})`);
    return {
      prompt: `احسب قيمة العبارة $${tex}$ إذا كان $${X} = ${x}$ ، $${Y} = ${y}$`,
      answer: { kind: 'fraction', value, requireSimplest: true },
      answerTex: texBoth(value),
      hints: ['عوّض كل متغير بقيمته بين قوسين، ثم اتبع ترتيب العمليات.', `$${sub}$`],
      solution: [`نعوّض: $${sub}$`, 'نحسب الأسس أولاً ثم الضرب ثم الجمع والطرح.', `$= ${texBoth(value)}$`],
      placeholder: PH,
      meta: { js },
    };
  },
};

/* ---------- 5. True or false? (exponent rules) ---------- */
function tfStatement(rng: Rng): { tex: string; lhs: string; rhs: string; why: string } {
  const a = rng.int(2, 6);
  const n = rng.int(2, 5);
  switch (rng.int(0, 5)) {
    case 0:
      return { tex: `(-${a})^{${n}} = -${a}^{${n}}`, lhs: `(-${a})**${n}`, rhs: `-(${a}**${n})`, why: `$(-${a})^{${n}} = ${(-a) ** n}$ بينما $-${a}^{${n}} = ${-(a ** n)}$` };
    case 1: {
      const r = rng.pick(['1', '0', String(a)]);
      return { tex: `${a}^{0} = ${r}`, lhs: `${a}**0`, rhs: r, why: `أي عدد غير الصفر أسه صفر يساوي $1$.` };
    }
    case 2: {
      const good = rng.chance(0.5);
      return good
        ? { tex: `${a}^{-${n}} = \\frac{1}{${a}^{${n}}}`, lhs: `${a}**(-${n})`, rhs: `1/${a}**${n}`, why: 'تعريف الأس السالب.' }
        : { tex: `${a}^{-${n}} = -${a}^{${n}}`, lhs: `${a}**(-${n})`, rhs: `-(${a}**${n})`, why: `الأس السالب لا يجعل الناتج سالباً: $${a}^{-${n}} = \\frac{1}{${a}^{${n}}}$` };
    }
    case 3: {
      const b = a === 2 && n === 2 ? 3 : a;
      return { tex: `${b}^{${n}} = ${b} \\times ${n}`, lhs: `${b}**${n}`, rhs: `${b}*${n}`, why: `$${b}^{${n}}$ تعني ضرب $${b}$ في نفسه $${n}$ مرات وتساوي $${b ** n}$.` };
    }
    case 4: {
      const v = a ** n;
      const shown = rng.chance(0.5) ? v : v + rng.pick([-a, a, n]);
      return { tex: `${a}^{${n}} = ${shown}`, lhs: `${a}**${n}`, rhs: String(shown), why: `$${a}^{${n}} = ${v}$` };
    }
    default: {
      const m = rng.int(3, 7);
      const shown = rng.chance(0.5) ? (m % 2 ? -1 : 1) : m % 2 ? 1 : -1;
      return { tex: `(-1)^{${m}} = ${shown}`, lhs: `(-1)**${m}`, rhs: String(shown), why: `الأس ${m % 2 ? 'فردي' : 'زوجي'} لذا $(-1)^{${m}} = ${m % 2 ? -1 : 1}$` };
    }
  }
}

export const trueFalse: Generator = {
  id: '2-8/true-false',
  lesson: '2-8',
  label: 'صح أم خطأ: قواعد الأسس',
  difficulties: [1, 2, 3],
  generate(rng) {
    const s = tfStatement(rng);
    const truth = evalExact(s.lhs).equals(evalExact(s.rhs));
    return {
      prompt: `صح أم خطأ؟ $$${s.tex}$$`,
      answer: { kind: 'choice', index: truth ? 0 : 1 },
      choices: ['✓ صح', '✗ خطأ'],
      answerTex: truth ? '\\text{صح}' : '\\text{خطأ}',
      hints: ['احسب قيمة كل طرف على حدة ثم قارن.'],
      solution: [s.why, truth ? 'العبارة صحيحة.' : 'العبارة خاطئة.'],
      meta: { lhs: s.lhs, rhs: s.rhs, truth },
    };
  },
};

/* ---------- 6. Doubling savings (book context p.69: عدنان) ---------- */
export const piggy: Generator = {
  id: '2-8/piggy',
  lesson: '2-8',
  label: 'مسائل: الحصالة المضاعفة',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const intro = 'يدّخر عدنان ديناراً واحداً في الشهر الأول، ثم يضاعف المبلغ كل شهر: $1, 2, 4, 8, \\ldots$ ديناراً.';
    if (d === 1) {
      const n = rng.int(5, 11);
      const v = 2 ** (n - 1);
      return {
        prompt: `${intro} كم ديناراً سيدّخر في الشهر ${n}؟`,
        answer: { kind: 'fraction', value: new Fraction(v) },
        answerTex: String(v),
        hints: ['المبالغ قوى للعدد $2$: الشهر 1 ← $2^{0}$، الشهر 2 ← $2^{1}$، الشهر 3 ← $2^{2}$ …', `في الشهر ${n}: $2^{${n - 1}}$`],
        solution: [`المبلغ في الشهر ${n} = $2^{${n} - 1} = 2^{${n - 1}}$`, `$2^{${n - 1}} = ${v}$ ديناراً`],
        placeholder: 'العدد بالدينار',
        meta: { js: `2**(${n}-1)` },
      };
    }
    if (d === 2) {
      const n = rng.int(6, 12);
      const v = 2 ** (n - 1);
      return {
        prompt: `${intro} في أيّ شهر سيدّخر $${v}$ ديناراً؟`,
        answer: { kind: 'fraction', value: new Fraction(n) },
        answerTex: `\\text{الشهر } ${n}`,
        hints: ['المبلغ في الشهر $n$ هو $2^{n-1}$.', `اكتب $${v}$ على صورة قوة للعدد $2$.`],
        solution: [`$${v} = 2^{${n - 1}}$`, `$n - 1 = ${n - 1}$ إذن $n = ${n}$، أي الشهر ${n}.`],
        placeholder: 'رقم الشهر',
        meta: { js: `${n}`, check: `2**(${n}-1) === ${v}` },
      };
    }
    const n = rng.int(4, 10);
    const total = 2 ** n - 1;
    const list = Array.from({ length: n }, (_, i) => 2 ** i).join(' + ');
    return {
      prompt: `${intro} كم ديناراً سيكون مجموع ما ادّخره في الشهور الـ ${n} الأولى؟ (ابحث عن نمط في المجاميع: $1, 3, 7, 15, \\ldots$)`,
      answer: { kind: 'fraction', value: new Fraction(total) },
      answerTex: String(total),
      hints: ['المجاميع: $1, 3, 7, 15$ … كل مجموع أقل بواحد من قوة للعدد $2$.', `المجموع بعد $n$ شهور = $2^{n} - 1$`],
      solution: [`$${list}$`, `النمط: المجموع بعد $n$ شهور $= 2^{n} - 1$`, `$2^{${n}} - 1 = ${2 ** n} - 1 = ${total}$`],
      placeholder: 'العدد بالدينار',
      meta: { js: `${list.replace(/ /g, '')}` },
    };
  },
};

export const generators2_8 = [write, evaluate, orderOps, substitute, trueFalse, piggy];
