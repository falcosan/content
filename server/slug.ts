const MAX_LENGTH = 60

const MAX_WORDS = 6

const CANDIDATES = 50

const FALLBACK = 'post'

const STOPWORDS = new Set(
    'a an and are as at by for from in into is of on or the to with'.split(' ')
)

const LETTERS: Record<string, string> = {
    ß: 'ss',
    æ: 'ae',
    œ: 'oe',
    ø: 'o',
    ł: 'l',
    đ: 'd',
    ð: 'd',
    þ: 'th',
    ı: 'i',
}

const UNDECOMPOSED = new RegExp(`[${Object.keys(LETTERS).join('')}]`, 'g')

const tokens = (word: string) =>
    word
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(UNDECOMPOSED, (letter) => LETTERS[letter]!)
        .replace(/['’]/g, '')
        .split(/[^a-z0-9]+/)
        .filter(Boolean)

const isStopword = (word: string[]) => word.length === 1 && STOPWORDS.has(word[0]!)

const join = ([first = '', ...rest]: string[]) => {
    let slug = first.slice(0, MAX_LENGTH)
    for (const token of rest) {
        if (slug.length + 1 + token.length > MAX_LENGTH) break
        slug += `-${token}`
    }
    return slug
}

export const slugify = (title: string) => {
    const words = title
        .split(/\s+/)
        .map(tokens)
        .filter((word) => word.length)
    const meaningful = words.filter((word) => !isStopword(word))
    return join((meaningful.length ? meaningful : words).flat().slice(0, MAX_WORDS))
}

export const slugCandidates = (title: string) => {
    const base = slugify(title) || FALLBACK
    return [base, ...Array.from({ length: CANDIDATES - 1 }, (_, index) => `${base}-${index + 2}`)]
}
