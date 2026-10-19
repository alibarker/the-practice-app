import type { Plan, PlanSection, SectionKind } from '../domain/types';

function section(
  planId: string,
  slug: string,
  title: string,
  minutes: number,
  notes?: string,
  kind: SectionKind = 'play',
): PlanSection {
  return { id: `${planId}-${slug}`, title, notes, durationSec: minutes * 60, kind };
}

const rest = (planId: string, slug: string, minutes: number) =>
  section(planId, slug, 'Rest', minutes, undefined, 'rest');

export const PLANS: Plan[] = [
  {
    id: 'plan-25',
    name: '25 min',
    sections: [
      section('p25', 'breathing', 'Breathing + buzzing', 3, 'Breathing and mouthpiece buzzing'),
      section('p25', 'long-tones', 'Long tones', 5, 'G down to low C and back, soft'),
      section('p25', 'lip-slurs', 'Lip slurs', 5, 'Through the valve combinations'),
      section('p25', 'technique', 'Technique', 5, 'Clarke study or scales with metronome'),
      section('p25', 'range', 'Gentle range', 2, 'Stepwise to your comfortable top'),
      section('p25', 'tune', 'Tune + improvisation', 4),
      section('p25', 'warm-down', 'Warm-down', 1, 'Soft low notes'),
    ],
  },
  {
    id: 'plan-45',
    name: '45 min',
    sections: [
      section('p45', 'breathing', 'Breathing + buzzing', 4),
      section('p45', 'long-tones', 'Long tones', 7, 'Plus soft attacks'),
      section('p45', 'lip-slurs', 'Lip slurs', 7, 'Plus wider intervals'),
      rest('p45', 'rest-1', 3),
      section('p45', 'technique', 'Technique', 8, 'Clarke, scales, arpeggios; rotate articulation'),
      section('p45', 'range', 'Range work', 4),
      rest('p45', 'rest-2', 2),
      section('p45', 'repertoire', 'Repertoire', 10, 'Standard or transcription'),
      section('p45', 'warm-down', 'Warm-down', 2),
    ],
  },
  {
    id: 'plan-60',
    name: '60 min',
    sections: [
      section('p60', 'breathing', 'Breathing + buzzing', 5),
      section('p60', 'long-tones', 'Long tones', 8, 'Full range + dynamics'),
      section('p60', 'slurs', 'Slurs + lip trills', 8),
      rest('p60', 'rest-1', 3),
      section('p60', 'technique', 'Technique', 10, 'Clarke, scales, jazz patterns (ii–V, bebop)'),
      section('p60', 'etude', 'Etude', 7, 'Arban, Charlier, lyrical'),
      rest('p60', 'rest-2', 3),
      section('p60', 'range', 'Range + endurance', 5),
      section('p60', 'standard', 'Standard in depth', 10, 'Play-along'),
      section('p60', 'warm-down', 'Warm-down', 2),
    ],
  },
];

export function findPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
