export function setCookie(name, value, days) {
    let expires = ''
    if (days) {
        const date = new Date()
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
        expires = '; expires=' + date.toGMTString()
    }
    document.cookie = name + '=' + value + expires + '; path=/'
}

export function getCookie(name) {
    let res
    const key = name + '='
    const decoded = decodeURIComponent(document.cookie)
    const arr = decoded.split('; ')
    arr.forEach((val) => {
        if (val.indexOf(key) === 0) res = val.substring(key.length)
    })
    return res
}

export function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT;`
}
