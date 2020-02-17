const isUrl = require("is-valid-http-url");

module.exports = class Formatter {
    constructor() {
        this.textRegex = /\(bkz:([a-z]| |[ı,ğ,ü,ş,ö,ç]|[A-Z]|[İ,Ğ,Ü,Ş,Ö,Ç])*\)/g;
    }

    formatDate = (date) => {
        date = new Date(date)
        var month = date.getMonth() + 1
        if (month.toString().length == 1) {
            month = '0' + month.toString()
        }
        var day = date.getDate()
        if (day.toString().length == 1) {
            day = '0' + day.toString()
        }
        var hour = date.getHours()
        if (hour.toString().length == 1) {
            hour = '0' + hour.toString()
        }
        var minute = date.getMinutes()
        if (minute.toString().length == 1) {
            minute = '0' + minute.toString()
        }
        var second = date.getSeconds()
        if (second.toString().length == 1) {
            second = '0' + second.toString()
        }
        [date.getFullYear(), month, day, hour, minute, second, date.getMilliseconds()]
        return `${day}.${month}.${date.getFullYear()} ${hour}: ${minute}`
    }

    formatLastActivity = (date) => {
        var now = Date.now()
        if (Math.floor((now - date) / (365 * 24 * 60 * 60 * 1000)) > 0) {
            return Math.floor((now - date) / (365 * 24 * 60 * 60 * 1000)) + ' yıl önce'
        } else if (Math.floor((now - date) / (30 * 24 * 60 * 60 * 1000)) > 0) {
            return Math.floor((now - date) / (30 * 24 * 60 * 60 * 1000)) + ' ay önce'
        } else if (Math.floor((now - date) / (7 * 24 * 60 * 60 * 1000)) > 0) {
            return Math.floor((now - date) / (7 * 24 * 60 * 60 * 1000)) + ' hafta önce'
        } else if (Math.floor((now - date) / (1 * 24 * 60 * 60 * 1000)) > 0) {
            return Math.floor((now - date) / (1 * 24 * 60 * 60 * 1000)) + ' gün önce'
        } else return 'bugün'
    }

    formatClientEntry = (_text) => {
        let text = _text
        text = this.formatBkz(text)
        text = this.formatLinks(text)
        text = text.replace(/\n/g, '<br/>')
        return text
    }

    formatServerEntry = (text) => {
        let _text = text
        _text.trim()
        _text = this.removeIllegalChars(_text)
        _text = this.toLowerCase(_text)
        return _text
    }

    formatTopic = (text) => {
        let _text = text
        _text.trim()
        _text = this.toLowerCase(_text)
        return _text
    }

    formatBkz = (_text) => {
        let text = _text
        let bkzs = text.match(this.textRegex)
        if (bkzs) {
            for (let i = 0; i < bkzs.length; i++) {
                let element = bkzs[i]
                let con = element.slice(5, element.length - 1)
                text = text.replace(new RegExp(`\\(bkz:${con}\\)`, 'g'), `(bkz: <a style="color:#69969C" target="_blank" href="/?q=${con}">${con}</a>)`)
            }
        }
        return text
    }

    formatLinks = (_text) => {
        let text = _text
        let links = text.match(/\[.* .*\]/g)
        if (links) {
            for (let i = 0; i < links.length; ++i) {
                let link = links[i].slice(1, links[i].indexOf(' '))
                let placeholder = links[i].slice(links[i].indexOf(' ') + 1, links[i].length - 1)
                if (isUrl(link)) {
                    text = text.replace(new RegExp(`\\[${link} ${placeholder}\\]`), `<a style="color:#69969C" target="_blank" href="${link}">${placeholder}</a>`)
                }
            }
        }
        return text
    }

    removeIllegalChars = (_text) => {
        let text = _text
        for (let i = 0; i < text.length; ++i) {
            if ((text.charCodeAt(i) < 32 || text.charCodeAt(i) > 126) && !['İ', 'Ğ', 'Ü', 'Ş', 'Ö', 'Ç', '<', 'i', 'ğ', 'ü', 'ş', 'ö', 'ç', '&lt', 'ı', '\n', "”"].includes(text[i])) {
                text = text.slice(0, i) + '?' + text.slice(i + 1, text.length)
            }
        }
        text = text.replace(/</g, '&lt')
        return text
    }

    toLowerCase = (_text) => {
        let text = _text
        let a = ['İ', 'Ğ', 'Ü', 'Ş', 'Ö', 'Ç', '<']
        let b = ['i', 'ğ', 'ü', 'ş', 'ö', 'ç', '&lt']

        for (let i = 0; i < a.length; ++i) {
            text = text.replace(new RegExp(`${a[i]}`, 'g'), b[i])
        }
        text = text.toLowerCase()
        return text
    }

    formatEmail = (email) => {
        let _email = email
        _email = this.toLowerCase(_email)
        _email = _email.trim()
        return _email
    }

    formatUsername = (username) => {
        let _username = username
        _username = _username.trim()
        _username = _username.toLowerCase()
        return _username
    }

    convertTurkishChars = (text) => {
        let _text = text
        _text = _text.trim()
        let a = ['İ', 'Ğ', 'Ü', 'Ş', 'Ö', 'Ç', 'ı', 'ğ', 'ü', 'ş', 'ö', 'ç', '\'']
        let b = ['I', 'G', 'U', 'S', 'O', 'C', 'i', 'g', 'u', 's', 'o', 'c', '']

        /*for (let i = 0; i < a.length; ++i) {
            _text = _text.replace(new RegExp(`${a[i]}`), b[i])
        }*/
        for(let i = 0; i < _text.length; ++i){
            if(a.includes(_text[i])){
                _text = _text.slice(0, i) + b[a.indexOf(_text[i])] + _text.slice(i + 1, _text.length)
            }
        }
        return _text
    }
}