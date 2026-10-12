import type { ProfileQuestion, StyleIntent, StyleProfile } from '@/types'
import { hasSizing } from './sizing'

/**
 * Deciding what to ask.
 *
 * The rule throughout: ask only for what would change the answer, and say why.
 * A shopper who wants to browse should never be gated behind a questionnaire,
 * so this returns at most a couple of questions at a time and every one of
 * them is skippable.
 */

const QUESTIONS: Record<string, ProfileQuestion> = {
  fit: {
    id: 'fit',
    field: 'fit',
    question: 'How do you like clothes to sit on you?',
    because: 'This is the single biggest factor in whether a piece works — it changes which size I suggest and which cuts I put forward.',
    kind: 'choice',
    weight: 100,
    options: [
      { value: 'fitted',    label: 'Close to the body', hint: 'Tailored, defined' },
      { value: 'true',      label: 'True to size',      hint: 'As the designer cut it' },
      { value: 'relaxed',   label: 'Relaxed',           hint: 'Room to move' },
      { value: 'oversized', label: 'Oversized',         hint: 'Deliberately generous' },
    ],
  },

  height: {
    id: 'height',
    field: 'height',
    question: 'How tall are you?',
    because: 'Proportion is most of styling. Height tells me where a midi hem will actually fall on you and whether a cropped trouser reads as intentional.',
    kind: 'number',
    unit: 'cm',
    min: 130,
    max: 220,
    weight: 90,
  },

  weight: {
    id: 'weight',
    field: 'weight',
    question: 'And roughly your weight?',
    because: 'Only used alongside height to estimate a starting size. A chest or waist measurement would replace it and be more accurate.',
    kind: 'number',
    unit: 'kg',
    min: 35,
    max: 200,
    weight: 70,
  },

  chest: {
    id: 'chest',
    field: 'chest',
    question: 'Chest measurement, if you know it?',
    because: 'The most reliable way to size tops, knitwear and outerwear. Measure around the fullest part, tape level.',
    kind: 'number',
    unit: 'cm',
    min: 60,
    max: 160,
    weight: 85,
  },

  waist: {
    id: 'waist',
    field: 'waist',
    question: 'Waist measurement?',
    because: 'What I size trousers and skirts from. Measure at your natural waist, the narrowest point.',
    kind: 'number',
    unit: 'cm',
    min: 50,
    max: 150,
    weight: 84,
  },

  shoeSize: {
    id: 'shoeSize',
    field: 'shoeSize',
    question: 'Shoe size?',
    because: "So I only show footwear you can actually order.",
    kind: 'number',
    unit: 'EU',
    min: 33,
    max: 50,
    weight: 60,
  },

  bodyShape: {
    id: 'bodyShape',
    field: 'bodyShape',
    question: 'Which of these sounds most like your proportions?',
    because: 'It guides where I place volume and structure. Entirely optional — skip it and I will work from measurements alone.',
    kind: 'choice',
    weight: 50,
    options: [
      { value: 'straight',          label: 'Fairly straight',    hint: 'Shoulders, waist and hips close in width' },
      { value: 'hourglass',         label: 'Defined waist',      hint: 'Shoulders and hips balanced' },
      { value: 'pear',              label: 'Fuller through hips',hint: 'Hips wider than shoulders' },
      { value: 'apple',             label: 'Fuller through middle', hint: 'Weight carried at the waist' },
      { value: 'inverted-triangle', label: 'Broader shoulders',  hint: 'Shoulders wider than hips' },
      { value: 'unspecified',       label: 'Rather not say',     hint: 'I will work from measurements' },
    ],
  },

  budgetPerItem: {
    id: 'budgetPerItem',
    field: 'budgetPerItem',
    question: 'A comfortable ceiling per piece?',
    because: 'So I stop suggesting a coat that is twice what you wanted to spend.',
    kind: 'number',
    unit: '$',
    min: 50,
    max: 2000,
    weight: 40,
  },
}

const IMPERIAL_UNITS: Record<string, string> = { cm: 'in', kg: 'lbs', EU: 'US' }

/** Re-label a question's unit for the shopper's chosen system. */
function localise(q: ProfileQuestion, units: StyleProfile['units']): ProfileQuestion {
  if (units === 'metric' || !q.unit) return q
  const unit = IMPERIAL_UNITS[q.unit] ?? q.unit
  const conv = q.unit === 'cm' ? 0.3937 : q.unit === 'kg' ? 2.2046 : 1
  return {
    ...q,
    unit,
    min: q.min ? Math.round(q.min * conv) : q.min,
    max: q.max ? Math.round(q.max * conv) : q.max,
  }
}

/**
 * Which questions would most improve the next recommendation.
 *
 * `intent` narrows the ask: someone requesting shoes is not asked their
 * inseam. Returns at most `limit`, highest value first.
 */
export function nextQuestions(
  profile: StyleProfile,
  intent?: StyleIntent,
  limit = 2,
): ProfileQuestion[] {
  const missing = (f: keyof StyleProfile) => profile[f] === undefined || profile[f] === null
  const pool: ProfileQuestion[] = []

  // Fit preference is the highest-value single answer, always worth asking.
  if (missing('fit')) pool.push(QUESTIONS.fit)

  // Sizing: prefer a real measurement, fall back to height+weight.
  if (!hasSizing(profile)) {
    if (missing('height')) pool.push(QUESTIONS.height)
    if (missing('weight') && !missing('height')) pool.push(QUESTIONS.weight)
    if (missing('chest')) pool.push(QUESTIONS.chest)
    if (missing('waist')) pool.push(QUESTIONS.waist)
  } else {
    // Has something usable, but a direct measurement would sharpen it.
    if (missing('chest') && missing('waist')) pool.push(QUESTIONS.chest)
  }

  if (missing('shoeSize')) pool.push(QUESTIONS.shoeSize)
  if (missing('bodyShape')) pool.push(QUESTIONS.bodyShape)
  if (missing('budgetPerItem') && !intent?.budget) pool.push(QUESTIONS.budgetPerItem)

  return pool
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((q) => localise(q, profile.units))
}

/**
 * How much the stylist's answer is limited by what it does not know.
 * Drives the honest "I could do better if…" line under a set of looks.
 */
export function confidenceNote(profile: StyleProfile): string | null {
  if (!hasSizing(profile) && !profile.fit) {
    return 'I styled these on look alone — I have no sizing or fit preference for you yet.'
  }
  if (!hasSizing(profile)) {
    return 'These match your fit preference, but I cannot suggest sizes without a measurement.'
  }
  if (!profile.fit) {
    return 'Sizes are based on your measurements; telling me how you like things to fit would sharpen them.'
  }
  return null
}

export const allQuestions = Object.values(QUESTIONS)
