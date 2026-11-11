import Fraction from 'fraction.js';
import { makeChoices } from '../core/choices';
import { texFrac } from '../core/mathutil';
import type { Generator } from '../core/question';
import { X, texNum } from './util';

/* ---------- 1. Evaluate √, −√, ±√ ---------- */
export const sqrt: Generator = {
  id: '3-1/sqrt',
  lesson: '3-1',
  label: 'إيجاد الجذور التربيعية',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    if (d === 3) {
      if (rng.chance(0.5)) {
        const p = rng.int(1, 9);
        let q = rng.int(2, 12);
        while (q === p) q = rng.int(2, 12);
        const f = new Fraction(p, q);
        const n = f.mul(f);
        return {
          prompt: `أوجد: $$\\sqrt{${texFrac(n)}}$$`,
          answer: { kind: 'fraction', value: f, requireSimplest: true },
          answerTex: texFrac(f),
          hints: ['جذر الكسر = جذر البسط ÷ جذر المقام.'],
          solution: [`$\\sqrt{${texFrac(n)}} = \\frac{\\sqrt{${n.n}}}{\\sqrt{${n.d}}} = ${texFrac(f)}$ لأن $\\left(${texFrac(f)}\\right)^{2} = ${texFrac(n)}$`],
          placeholder: 'مثال: 3/4',
          meta: { root: f.valueOf(), radicand: n.valueOf(), sign: 1 },
        };
      }
      const r = new Fraction(rng.int(1, 15), 10);
      const n = r.mul(r);
      return {
        prompt: `أوجد: $$\\sqrt{${texNum(n)}}$$`,
        answer: { kind: 'fraction', value: r, requireSimplest: false },
        answerTex: texNum(r),
        hints: [`أي عدد عشري إذا ضربته في نفسه أعطى $${texNum(n)}$؟`],
        solution: [`$${texNum(r)} \\times ${texNum(r)} = ${texNum(n)}$ إذن $\\sqrt{${texNum(n)}} = ${texNum(r)}$`],
        placeholder: 'مثال: 0.7',
        meta: { root: r.valueOf(), radicand: n.valueOf(), sign: 1 },
      };
    }
    const k = rng.int(d === 1 ? 1 : 4, d === 1 ? 15 : 20);
    const n = k * k;
    const form = d === 1 ? '+' : rng.pick(['+', '-', '±'] as const);
    if (form === '±') {
      return {
        prompt: `أوجد: $$\\pm\\sqrt{${n}}$$`,
        answer: { kind: 'plusminus', value: new Fraction(k) },
        answerTex: `\\pm ${k}`,
        hints: ['$\\pm$ تعني الجذرين الموجب والسالب معاً. اكتب الإجابة هكذا: ‎+-7‎ أو ±7'],
        solution: [`$${k}^{2} = ${n}$ و $(-${k})^{2} = ${n}$`, `إذن $\\pm\\sqrt{${n}} = \\pm ${k}$`],
        placeholder: 'مثال: ±7 (اكتب +- )',
        meta: { root: k, radicand: n, sign: 0 },
      };
    }
    const v = form === '-' ? -k : k;
    return {
      prompt: `أوجد: $$${form === '-' ? '-' : ''}\\sqrt{${n}}$$`,
      answer: { kind: 'fraction', value: new Fraction(v) },
      answerTex: String(v),
      hints: [form === '-' ? 'الإشارة السالبة خارج الجذر: نوجد الجذر الموجب ثم نضع الإشارة السالبة.' : 'الجذر التربيعي الموجب: أي عدد موجب مربعه يساوي العدد تحت الجذر؟'],
      solution: [`$${k}^{2} = ${n}$`, `إذن $${form === '-' ? '-' : ''}\\sqrt{${n}} = ${v}$`],
      placeholder: 'العدد',
      meta: { root: k, radicand: n, sign: form === '-' ? -1 : 1 },
    };
  },
};

/* ---------- 2. Solve س² = n ---------- */
export const equation: Generator = {
  id: '3-1/equation',
  lesson: '3-1',
  label: 'حل معادلات تربيعية بسيطة',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    let r: Fraction;
    let decimal = false;
    if (d === 3 && rng.chance(0.5)) {
      decimal = true; // e.g. س² = 0.49 (decimals of the form k/10 always terminate when squared)
      r = new Fraction(rng.int(1, 12), 10);
    } else if (d === 3) {
      r = new Fraction(rng.int(1, 9), rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10]));
    } else r = new Fraction(rng.int(d === 1 ? 2 : 11, d === 1 ? 12 : 25));
    const n = r.mul(r);
    const nTex = decimal ? texNum(n) : texFrac(n);
    const rTex = decimal ? texNum(r) : texFrac(r);
    return {
      prompt: `حل المعادلة: $$${X}^{2} = ${nTex}$$`,
      answer: { kind: 'plusminus', value: r },
      answerTex: `${X} = \\pm ${rTex}`,
      hints: ['للمعادلة حلّان لأن مربع العدد الموجب ومربع العدد السالب متساويان.', `$${X} = \\pm\\sqrt{${nTex}}$`],
      solution: [`نأخذ الجذر التربيعي للطرفين: $${X} = \\pm\\sqrt{${nTex}}$`, `$${X} = \\pm ${rTex}$`, `تحقّق: $(${rTex})^{2} = ${nTex}$ و $(-${rTex})^{2} = ${nTex}$ ✓`],
      placeholder: 'مثال: ±7 (اكتب +- )',
      meta: { root: r.valueOf(), radicand: n.valueOf() },
    };
  },
};

/* ---------- 3. Tile pattern (book context p.80) ---------- */
export const tiles: Generator = {
  id: '3-1/tiles',
  lesson: '3-1',
  label: 'مسائل: نمط البلاطات المربعة',
  difficulties: [1, 2, 3],
  generate(rng, d) {
    const intro = 'تُرتَّب بلاطات مربعة على شكل مربعات: الشكل 1 فيه $1$ بلاطة، والشكل 2 فيه $4$، والشكل 3 فيه $9$، والشكل 4 فيه $16$ بلاطة.';
    const n = rng.int(6, d === 1 ? 12 : 20);
    if (d === 1) {
      return {
        prompt: `${intro} كم بلاطة في الشكل ${n}؟`,
        answer: { kind: 'fraction', value: new Fraction(n * n) },
        answerTex: String(n * n),
        hints: ['عدد البلاطات في الشكل $n$ هو $n^{2}$.'],
        solution: [`الشكل ${n} مربع ضلعه $${n}$ بلاطات: $${n}^{2} = ${n * n}$ بلاطة.`],
        placeholder: 'العدد',
        meta: { value: n * n, check: n * n },
      };
    }
    if (d === 2) {
      return {
        prompt: `${intro} أيّ شكل يحتوي على $${n * n}$ بلاطة؟`,
        answer: { kind: 'fraction', value: new Fraction(n) },
        answerTex: `\\text{الشكل } ${n}`,
        hints: [`أوجد $\\sqrt{${n * n}}$`],
        solution: [`$\\sqrt{${n * n}} = ${n}$ إذن هو الشكل ${n}.`],
        placeholder: 'رقم الشكل',
        meta: { value: n, check: n * n },
      };
    }
    const area = n * n;
    const askPerimeter = rng.chance(0.5);
    return {
      prompt: `حديقة مربعة الشكل مساحتها $${area}$ م². ${askPerimeter ? 'ما محيطها بالأمتار؟' : 'ما طول ضلعها بالأمتار؟'}`,
      answer: { kind: 'fraction', value: new Fraction(askPerimeter ? 4 * n : n) },
      answerTex: String(askPerimeter ? 4 * n : n),
      hints: ['مساحة المربع = طول الضلع². إذن طول الضلع = $\\sqrt{\\text{المساحة}}$.'],
      solution: [`طول الضلع $= \\sqrt{${area}} = ${n}$ م`, ...(askPerimeter ? [`المحيط $= 4 \\times ${n} = ${4 * n}$ م`] : [])],
      placeholder: 'العدد',
      meta: { value: askPerimeter ? 4 * n : n, check: area },
    };
  },
};

/* ---------- 4. Which is the square root? (multiple choice, common confusions) ---------- */
export const meaning: Generator = {
  id: '3-1/meaning',
  lesson: '3-1',
  label: 'مفهوم الجذر التربيعي',
  difficulties: [1, 2],
  generate(rng, d) {
    const k = rng.int(3, d === 1 ? 10 : 20);
    const n = k * k;
    const { choices, index } = makeChoices(rng, `$${k}$`, [`$${n / 2}$`, `$${n * n}$`, `$${2 * k}$`, `$${k + 1}$`, `$-${k}$`].filter((c) => c !== `$${k}$`));
    return {
      prompt: `ما قيمة $\\sqrt{${n}}$؟`,
      answer: { kind: 'choice', index },
      choices,
      answerTex: String(k),
      hints: ['الجذر التربيعي لا يعني القسمة على 2!'],
      solution: [`$${k} \\times ${k} = ${n}$ إذن $\\sqrt{${n}} = ${k}$ (الرمز $\\sqrt{\\ }$ يعني الجذر الموجب فقط).`],
      meta: { root: k, radicand: n },
    };
  },
};

export const generators3_1 = [sqrt, equation, tiles, meaning];
