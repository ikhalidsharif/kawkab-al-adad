import type { Rich } from '../core/question';

export interface LearnSlide {
  title: string;
  /** Short explanation shown at once. */
  body: Rich;
  /** Worked-example steps revealed one at a time with "التالي". */
  steps?: Rich[];
  /** Optional tip shown after the last step. */
  tip?: Rich;
}

export interface LearnContent {
  goal: string;
  vocab?: string[];
  slides: LearnSlide[];
}
