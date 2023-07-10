export const importFilter = (data, filters, rule, strict = false) => {
    const filterFn = (k) => {
        if (strict) {
            if (Array.isArray(filters)) {
                return rule
                    ? filters.every((filter) => k === filter)
                    : filters.every((filter) => k !== filter);
            } else {
                return rule ? k === filters : k !== filters;
            }
        } else {
            const filterRegex = new RegExp(
                Array.isArray(filters) ? filters.join('|') : filters
            );
            return rule ? filterRegex.test(k) : !filterRegex.test(k);
        }
    };
    return Object.entries(data).reduce((acc, [k, v]) => {
        if (filterFn(k)) {
            acc[k] = v;
        }
        return acc;
    }, {});
};

export const checkEqualObjects = (a, b) => {
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object' || a === null) return a === b;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
        if (!(key in b)) return false;
        if (Array.isArray(a[key])) {
            if (!Array.isArray(b[key]) || a[key].length !== b[key].length)
                return false;
            for (let i = 0; i < a[key].length; i++) {
                if (!checkEqualObjects(a[key][i], b[key][i])) return false;
            }
        } else if (typeof a[key] === 'object' && a[key] !== null) {
            if (!checkEqualObjects(a[key], b[key])) return false;
        } else if (a[key] !== b[key]) return false;
    }
    return true;
};
