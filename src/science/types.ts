import type { Rich } from '../core/question';

export interface LearnSlide {
  title: string;
  /** Short explanation shown at once. */
  body: Rich;
  /** Points revealed one at a time with "التالي". */
  steps?: Rich[];
  tip?: Rich;
  /** Diagram id shown with the slide (names visible). */
  diagram?: string;
  /** Book pages this slide summarises. */
  pages: string;
}

export interface LearnContent {
  goal: string;
  vocab?: string[];
  slides: LearnSlide[];
}
