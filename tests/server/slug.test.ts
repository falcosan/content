import { describe, expect, it } from 'vitest'
import { slugCandidates, slugify } from '../../server/slug'

describe('slugify', () => {
    it.each([
        ['IndexedDB in TypeScript', 'indexeddb-typescript'],
        ['The Entropy of States', 'entropy-states'],
        ['An Equally Driven Second Choice', 'equally-driven-second-choice'],
        ['What Is a Monorepo, and Why Use One?', 'what-monorepo-why-use-one'],
    ])('drops stopwords from %j', (title, slug) => {
        expect(slugify(title)).toBe(slug)
    })

    it.each([
        ['Año Crítico Olé', 'ano-critico-ole'],
        ['Ça va?  Très bien!', 'ca-va-tres-bien'],
        ['Straße, Æsir, Søren, Łódź, Þór', 'strasse-aesir-soren-lodz-thor'],
        ['ﬁnal ２０２５ round²', 'final-2025-round2'],
    ])('transliterates %j', (title, slug) => {
        expect(slugify(title)).toBe(slug)
    })

    it('joins possessives and contractions instead of splitting them', () => {
        expect(slugify("Bill Holt's Dreamies")).toBe('bill-holts-dreamies')
        expect(slugify('Don’t Panic')).toBe('dont-panic')
    })

    it('only drops stopwords that stand alone', () => {
        expect(slugify('A/B testing in e-commerce')).toBe('a-b-testing-e-commerce')
        expect(slugify('Plan A')).toBe('plan')
    })

    it('keeps negations and meaningful short words', () => {
        expect(slugify('Coffee without sugar, no more')).toBe('coffee-without-sugar-no-more')
        expect(slugify('Redundant roles in IT companies')).toBe('redundant-roles-it-companies')
    })

    it('keeps names that look like words from other languages', () => {
        expect(slugify("De Morgan's Laws in La Liga")).toBe('de-morgans-laws-la-liga')
    })

    it('keeps every word when they are all stopwords', () => {
        expect(slugify('Of the and')).toBe('of-the-and')
        expect(slugify('To and from')).toBe('to-and-from')
    })

    it('collapses punctuation and whitespace into single hyphens', () => {
        expect(slugify('  hello,,,   world!!! -- Vue 3.5 ')).toBe('hello-world-vue-3-5')
    })

    it('keeps the first six words', () => {
        expect(slugify('one two three four five six seven eight')).toBe(
            'one-two-three-four-five-six'
        )
    })

    it('cuts at a word boundary within 60 characters', () => {
        const slug = slugify(
            'internationalization accessibility observability reliability performance'
        )
        expect(slug).toBe('internationalization-accessibility-observability-reliability')
        expect(slug).toHaveLength(60)
    })

    it('cuts a single overlong word at 60 characters', () => {
        expect(slugify('x'.repeat(80))).toBe('x'.repeat(60))
    })

    it.each(['', '   ', '🚀 ✨', '日本語', '—'])('returns an empty slug for %j', (title) => {
        expect(slugify(title)).toBe('')
    })
})

describe('slugCandidates', () => {
    it('starts with the slug and continues with numbered variants', () => {
        const candidates = slugCandidates('Hello World')
        expect(candidates).toHaveLength(50)
        expect(candidates.slice(0, 3)).toEqual(['hello-world', 'hello-world-2', 'hello-world-3'])
        expect(candidates.at(-1)).toBe('hello-world-50')
    })

    it('falls back to a generic slug when the title has no usable characters', () => {
        expect(slugCandidates('🚀').slice(0, 2)).toEqual(['post', 'post-2'])
    })

    it('only produces valid slugs', () => {
        const titles = ['Ünïcödé — títulos', '  ', 'x'.repeat(200), "it's 2025"]
        for (const slug of titles.flatMap(slugCandidates)) {
            expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
            expect(slug.length).toBeLessThanOrEqual(63)
        }
    })
})
