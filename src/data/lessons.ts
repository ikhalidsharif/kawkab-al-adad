import type { LessonId } from '../core/question';
import type { MixEntry } from '../generators';
import { STATIONS, type GameDef } from './science';
import type { LearnContent } from '../science/types';

export type { GameDef };

export interface LessonDef {
  id: LessonId;
  chapter: 2 | 3;
  title: string;
  /** Book pages, e.g. "53–55". */
  pages: string;
  /** False until the station is built; shown as "قريباً" on the map. */
  available: boolean;
  mix: MixEntry[];
  learn?: LearnContent;
  game?: GameDef;
  extraGames?: GameDef[];
}

/** How often each question type appears in practice/blitz/boss (computed data questions use "data"). */
const TYPE_WEIGHT: Record<string, number> = { mc: 3, tf: 2, term: 2, label: 2, order: 1, sort: 1, match: 1, data: 1 };

export const LESSONS: LessonDef[] = STATIONS.map((s) => ({
  id: s.id,
  chapter: s.chapter,
  title: s.title,
  pages: s.pages,
  available: s.available,
  learn: s.learn,
  game: s.game,
  extraGames: s.extraGames,
  mix: s.generators.map((g) => ({ gen: g.id, weight: TYPE_WEIGHT[g.id.split('/')[1]] ?? TYPE_WEIGHT.data })),
}));

export interface BossDef {
  chapter: 2 | 3;
  name: string;
  /** Mixed questions from every station of the chapter. */
  mix: MixEntry[];
  available: boolean;
}

export const REGIONS = [
  { chapter: 2 as const, name: 'كوكب المناعة', sub: 'الفصل 2 – الدرس 2-2: المناعة والمرض (ص 53–63)', boss: 'سيّد العدوى' },
  { chapter: 3 as const, name: 'مجرّة الأجهزة', sub: 'الفصل 3: أجهزة الهضم والتنفس والإخراج (ص 72–97)', boss: 'حارس الأجهزة' },
];

/** A chapter boss mixes the questions of all its built stations (enabled once every station is built). */
export const BOSSES: BossDef[] = REGIONS.map((r) => {
  const lessons = LESSONS.filter((l) => l.chapter === r.chapter);
  return { chapter: r.chapter, name: r.boss, available: lessons.every((l) => l.available), mix: lessons.flatMap((l) => l.mix) };
});

export function getBoss(chapter: number): BossDef | undefined {
  return BOSSES.find((b) => b.chapter === chapter);
}

export function getLesson(id: string): LessonDef | undefined {
  return LESSONS.find((l) => l.id === id);
}
