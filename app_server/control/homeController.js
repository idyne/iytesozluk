var User = require('../models/user');
var crypt = require('../../crypt');
var nodemailer = require('nodemailer');
var Topic = require('../models/topic');
var Entry = require('../models/entry');
var DailyNices = require('../models/dailyNices')
const Formatter = require('./Formatter')
const formatter = new Formatter()
const Conversation = require('../models/conversation')
const validator = require("email-validator");
const Report = require('../models/report')
const PasswordRequest = require('../models/passwordRequest')

const isLoggedIn = (req) => (req.session.email != undefined)

module.exports.homeGet = async function (req, res) {
    try {
        var context = {
            isLoggedIn: isLoggedIn(req),
            topics: [],
            homeTopics: [],
            nices: [],
            bads: [],
            h: true,
            username: '',
            q: '',
            m: false
        }
        var session = req.session
        var user = await User.findOne({ email: session.email })
        if (user != undefined) {
            context.nices = user.nices;
            context.bads = user.bads;
            context.username = user.username;
        }
        var topics = await Topic.find({}).sort("-lastUpdate").exec();
        context.topics = topics;
        if (req.query.q != undefined) {
            let link = generateLink(req.query.q.trim())
            let topic = await Topic.findOne({ link: link })
            if (topic)
                res.redirect(303, `/${generateLink(req.query.q.trim())}`)
            else {
                context.q = req.query.q.trim()
                res.render('newTopic', context)
            }
        } else {

            Topic.findRandom({}, {}, { limit: 10 }, async function (err, results) {
                if (err) {
                    console.log(error);
                    res.json({ success: false, errorCode: 1 })
                } else {
                    var homeTopics = results;
                    for (var i = 0; i < homeTopics.length; i++) {
                        context.homeTopics.push({
                            _id: homeTopics[i].id,
                            date: homeTopics[i].date,
                            topic: homeTopics[i].topic,
                            link: homeTopics[i].link,
                            firstEntry: null,
                        })
                    }
                    var entry;
                    for (var i = 0; i < context.homeTopics.length; i++) {
                        entry = (await Entry.find({ topic: context.homeTopics[i]._id }).sort('-nices').limit(1).exec())[0]
                        context.homeTopics[i].firstEntry = {
                            _id: entry._id,
                            id: entry.id,
                            date: entry.date,
                            nices: entry.nices,
                            entry: formatter.formatClientEntry(entry.entry),
                            owner: (await User.findOne({ _id: entry.owner })).username,
                            topic: entry.topic
                        }
                    }
                    if (context.isLoggedIn) context.m = (await Conversation.countDocuments({ owner: user.username, "lastMessage.isRead": false })) != 0
                    res.render("home", context);
                }
            });
        }

    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.signupGet = async function (req, res) {
    try {
        var context = { isLoggedIn: isLoggedIn(req), topics: [], title: 'kayıt' }
        var session = req.session
        if (context.isLoggedIn) {
            res.redirect(303, '/')
        } else {
            var topics = await Topic.find({}, null, { sort: '-lastUpdate' })
            context.topics = topics;
            res.render("signup", context);
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }

};

module.exports.signinGet = async function (req, res) {
    try {
        var context = { isLoggedIn: isLoggedIn(req), topics: [], title: 'giriş' }
        var session = req.session
        if (context.isLoggedIn) {
            res.redirect(303, '/')
        } else {
            var topics = await Topic.find({}, null, { sort: '-lastUpdate' })
            context.topics = topics;
            res.render("signin", context);
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }

};

function validateEmail(email) {
    email = formatter.formatEmail(email)
    let result = validator.validate(email)
    return result;
}

function validateGender(gender) {
    var result = false;
    try {
        gender = Number(gender);
        if (gender >= 0 && gender < 4) {
            result = true;
        }
    } catch (error) { }
    return result;
}

function validateUsername(username) {
    var result = true;
    username = formatter.formatUsername(username)
    if (username.length < 3 || username.length > 30) {
        result = false;
    } else {
        for (var i = 0; i < username.length; i++) {
            if ((username.charCodeAt(i) > 122 || username.charCodeAt(i) < 97) && username.charCodeAt(i) != 32) {
                result = false;
                break;
            }
        }
    }
    return result;
}

function validatePassword(password) {
    var hasLower = false;
    var hasUpper = false;
    var hasNumber = false;
    var isLong = false;
    for (var i = 0; i < password.length; i++) {
        if (password[i].toLowerCase() != password[i]) {
            hasUpper = true;
        }
        else if (password[i].toUpperCase() != password[i]) {
            hasLower = true;
        } else {
            try {
                if (typeof Number(password[i]) == "number") {
                    hasNumber = true;
                }
            } catch (error) { }
        }
    }
    if (password.length >= 8) {
        isLong = true;
    }
    return hasLower && hasUpper && hasUpper && isLong;
}

function validateBirthDate(birthDate) {
    var parsedDate = [];
    var result = false;
    try {
        parsedDate = birthDate.split('.');
        var birthYear = Number(parsedDate[2])
        if (parsedDate.length == 3 && ["31", "30", "29", "28", "27", "26", "25", "24", "23", "22", "21", "20", "19", "18", "17", "16", "15", "14", "13", "12", "11", "10", "9", "8", "7", "6", "5", "4", "3", "2", "1"].includes(parsedDate[0]) &&
            ["aralık", "ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım"].includes(parsedDate[1]) &&
            birthYear <= 2002 && birthYear >= 1923) {
            result = true;
        }
    } catch (error) { }
    return result;
}

module.exports.signupPost = async function (req, res) {
    try {
        var session = req.session
        if (session.email == undefined) {
            var email = formatter.formatEmail(req.body.email)
            var username = formatter.formatUsername(req.body.username)
            var emailValidation = validateEmail(email)
            var usernameValidation = validateUsername(username)
            const birthDateValidation = validateBirthDate(req.body.birthDate)
            const genderValidation = validateGender(req.body.gender)
            const passwordValidation = validatePassword(req.body.password)
            if (birthDateValidation && emailValidation && genderValidation && usernameValidation && passwordValidation) {
                var emailToken = crypt.createToken();
                var salt = crypt.genRandomString(16); /** Gives us salt of length 16 */
                var passwordData = crypt.sha512(req.body.password, salt);
                var user = await User.findOne({ email: email })
                if (user == undefined) {
                    user = await User.findOne({ username: username })
                    var parsedBirthDate = req.body.birthDate.split('.')
                    if (user == undefined) {
                        await User.create({
                            username: username,
                            email: email,
                            birthDate: new Date(parsedBirthDate[2], ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"].indexOf(parsedBirthDate[1]), Number(parsedBirthDate[0]) + 1),
                            gender: req.body.gender,
                            password: passwordData,
                            salt: salt,
                            registerDate: new Date(),
                            status: 'verified',
                            emailToken: emailToken,
                            userType: 'newbie'
                        })
                        //sendVerificationEmail(req.body.email, emailToken)
                        res.json({ success: true })
                    } else {
                        res.json({
                            success: false,
                            errorCode: 3,
                            errorMessage: "bu nick alınmış"
                        })
                    }
                } else {
                    res.json({
                        success: false,
                        errorCode: 2,
                        errorMessage: "bu e-postayla kayıt olunmuş"
                    })
                }
            } else {
                if (!emailValidation)
                    res.json({
                        success: false,
                        errorCode: 2,
                        errorMessage: "geçersiz e-posta adresi"
                    })
                else if (!usernameValidation)
                    res.json({
                        success: false,
                        errorCode: 3,
                        errorMessage: "geçersiz kullanıcı adı"
                    })
                else
                    res.json({
                        success: false,
                        errorCode: 1,
                    })
            }
        } else {
            res.redirect(303, '/')
        }
    } catch (error) {
        console.log('error:', error)
        res.json({
            success: false,
            errorCode: 1,
        })
    }

}


function sendVerificationEmail(email, token) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'iytekultur@gmail.com',
            pass: 'emre8138388'
        }
    });
    var text = `kullanıcı aktivasyonunu tamamlamak için linke tıklamalısın. http://iytesozluk.herokuapp.com/aktivasyon/${token}`
    var mailOptions = {
        from: 'iytekultur@gmail.com',
        to: email,
        subject: 'Verify E-mail',
        text: text,
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error)
        } else {
            console.log('Verification email sent: ' + info.response);

        }
    });
}

function sendPasswordEmail(email, token) {
    var transporter = nodemailer.createTransport({
        service: 'yandex',
        auth: {
            user: 'noreply@iytesozluk.com',
            pass: 'fezzpeimhvmrogix'
        }
    });
    var text = `parolanı sıfırlamak için linke tıkla http://www.iytesozluk.com/parola-sifirla/yeni-parola?token=${token}`
    var mailOptions = {
        from: 'noreply@iytesozluk.com',
        to: email,
        subject: 'parola sıfırlama isteği',
        text: text,
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error)
        } else {
            console.log('Password email sent: ' + info.response);

        }
    });
}

module.exports.verifyEmail = function (req, res) {
    var token = req.params.emailToken

    User.update({ emailToken: token }, { status: 'verified', emailToken: '' }, function (err) {
        if (err) {
            console.log('update error: ' + err)
            res.json({ success: false, errorCode: 1 })
        } else {
            res.redirect(303, '/')
        }
    })
}

module.exports.loginPost = async function (req, res) {
    try {
        var session = req.session
        if (session.email == undefined) {
            req.session.email = formatter.formatEmail(req.body.email);
            var user = await User.findOne({ email: req.session.email })
            var ipInfo = req.ipInfo
            ipInfo.ip = req.clientIp
            await user.update({ $push: { ips: { ipInfo: ipInfo, date: Date.now() } } })
            res.json({ success: true })
        } else {
            res.redirect(303, '/')
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }

}

module.exports.loginCheck = function (req, res, next) {
    try {
        var session = req.session
        if (session.email == undefined) {
            User.findOne({ email: formatter.formatEmail(req.body.email) }, function (err, user) {
                if (err) {
                    res.json({ success: false, errorCode: 1 })
                } else {
                    if (user != undefined && user.status == 'verified') {
                        if (user.password == crypt.sha512(req.body.password, user.salt)) {
                            next()
                        } else {
                            res.json({
                                success: false,
                                errorCode: 4,
                                errorMessage: "yanlış parola"
                            })
                        }
                    } else {
                        if (user == undefined) {
                            res.json({
                                success: false,
                                errorCode: 5,
                                errorMessage: "buralarda bu e-posta adresiyle kayıtlı kimse yok"
                            })
                        } else {
                            if (user.status != 'verified') {
                                res.json({
                                    success: false,
                                    errorCode: 6,
                                    errorMessage: "hesabını aktifleştir de gel"
                                })
                            }
                        }
                    }
                }

            })
        } else {
            res.redirect(303, '/')
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }

}

module.exports.logout = function (req, res) {
    try {
        var session = req.session
        if (session.email != undefined) {
            req.session.destroy(function (err) {
                if (err) {
                    console.log(err);
                    res.json({ success: false, errorCode: 1 })
                } else {
                    res.redirect(303, '/');
                }
            });
        } else {
            res.redirect(303, '/')
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

/*module.exports.newTopicGet = function (req, res) {
    try {
        var context = { isLoggedIn: false, topics: [], title: 'yeni başlık' }
        var session = req.session
        if (session.email != undefined) {
            context.isLoggedIn = true;
            Topic.find({}, null, { sort: '-lastUpdate' }, function (err, topics) {
                if (err) {
                    res.json({ success: false, errorCode: 1 })
                } else {
                    context.topics = topics;
                    res.render("newTopic", context);
                }
            })
        } else {
            res.redirect(303, '/')
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}*/

const validateTopic = (topic) => {
    var result = true;
    topic = formatter.formatTopic(topic)
    if (topic.length < 1 || topic.length > 50) {
        result = false;
    } else {
        for (var i = 0; i < topic.length; i++) {
            if ((topic.charCodeAt(i) > 122 || topic.charCodeAt(i) < 97) && !['ı', 'ğ', 'ü', 'ş', 'ö', 'ç', '\'', ' ', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(topic[i])) {
                result = false;
                break;
            }
        }
    }
    return result;
}

module.exports.newTopicPost = async function (req, res) {
    try {
        var date = Date.now();
        var session = req.session
        if (session.email != undefined) {
            var _entry = formatter.formatServerEntry(req.body.entry)
            var __topic = validateTopic(req.body.topic)
            if (_entry.length != 0 && __topic.length != 0) {
                var user = await User.findOne({ email: session.email })
                var _topic = await Topic.findOne({ topic: __topic })
                var topic_ = await Topic.findOne({ link: generateLink(__topic), })

                var datas = {
                    entry: _entry,
                    date: date,
                    owner: user._id,
                    topic: _topic == undefined && topic_ == undefined ? ' ' : _topic != undefined ? _topic.id.toString() : topic_.id.toString()
                }
                var entry = await Entry.create(datas)
                if (_topic == undefined && topic_ == undefined) {
                    var topicDatas = {
                        topic: __topic,
                        entries: [entry._id],
                        link: generateLink(__topic),
                        date: date,
                        lastUpdate: date
                    }
                    var topic = await Topic.create(topicDatas)
                    await Entry.updateOne({ _id: entry._id }, { topic: topic.id })
                } else if (_topic != undefined) {
                    _topic.updateOne({ $push: { entries: entry._id }, lastUpdate: date })
                } else {
                    topic_.updateOne({ $push: { entries: entry._id }, lastUpdate: date })
                }
                res.json({ success: true })
            } else {
                res.json({ success: false, errorCode: 1 })
            }
        } else {
            res.json({ success: false, errorCode: 1 })
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

function generateLink(topic) {
    let link = topic
    link = formatter.convertTurkishChars(link)
    link = link.replace(/ /g, '-')
    return link;
}


module.exports.newEntryPost = async function (req, res) {
    try {
        var date = Date.now();
        var session = req.session
        if (session.email != undefined) {
            var user = await User.findOne({ email: session.email })
            var _entry = formatter.formatServerEntry(req.body.entry)
            var _topic = req.body.topic
            if (_entry.length != 0 && validateTopic(_topic)) {
                _topic = formatter.formatTopic(_topic)
                var topic = await Topic.findOne({ topic: _topic })
                if (topic == undefined) topic = await Topic.create({
                    entries: [],
                    date: Date.now(),
                    lastUpdate: Date.now(),
                    topic: _topic,
                    link: generateLink(_topic)
                })
                var datas = {
                    entry: _entry,
                    date: date,
                    owner: user._id,
                    topic: topic.id
                }
                var entry = await Entry.create(datas)
                await Topic.updateOne({ topic: _topic }, { $push: { entries: entry.id.toString() }, lastUpdate: Date.now() })
                res.json({ success: true, link: generateLink(_topic) })
            } else {
                res.json({ success: false, errorCode: 1 })
            }
        } else {
            res.json({ success: false, errorCode: 1 })
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.notFound = async function (req, res) {
    try {
        var context = { isLoggedIn: false, topics: [], username: '' }
        var session = req.session
        if (session.email != undefined) {
            context.isLoggedIn = true;
            var user = await User.findOne({ email: session.email })
            context.username = user.username
        }
        Topic.find({}, null, { sort: '-lastUpdate' }, async function (err, topics) {
            if (err) {
                res.json({ success: false, errorCode: 1 })
            } else {
                context.topics = topics;
                context.m = (await Conversation.countDocuments({ owner: user.username, "lastMessage.isRead": false })) != 0
                res.render("404", context);
            }
        })
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.nice = async function (req, res) {
    try {
        var session = req.session
        if (session.email == undefined) {
            res.json({ success: false, errorCode: 1 })
        } else {
            if (req.body.nice == 0) {
                var user = await User.findOne({ email: req.session.email })
                if (user.nices.includes(req.body.id)) {
                    res.json({ success: false, errorCode: 1 })
                } else {
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
                    var dailyNices = await DailyNices.findOne({ date: { $gte: today }, entry: req.body.id }).exec();
                    if (dailyNices == undefined)
                        dailyNices = await DailyNices.create({ entry: req.body.id, date: today })
                    await dailyNices.updateOne({ $inc: { count: user.bads.includes(req.body.id) ? 2 : 1 } })
                    await Entry.update({ _id: req.body.id }, { $inc: { nices: user.bads.includes(req.body.id) ? 2 : 1 } })
                    await User.update({ email: req.session.email }, { $push: { nices: req.body.id }, $pull: { bads: req.body.id } })
                    res.json({ success: true })
                }
            }
            else if (req.body.nice == 1) {
                var user = await User.findOne({ email: req.session.email })
                if (user.bads.includes(req.body.id)) {
                    res.json({ success: false, errorCode: 1 })
                } else {
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
                    var dailyNices = await DailyNices.findOne({ date: { $gte: today }, entry: req.body.id }).exec();
                    if (dailyNices == undefined)
                        dailyNices = await DailyNices.create({ entry: req.body.id, date: today })
                    await dailyNices.updateOne({ $inc: { count: user.nices.includes(req.body.id) ? -2 : -1 } })
                    await Entry.update({ _id: req.body.id }, { $inc: { nices: user.nices.includes(req.body.id) ? -2 : -1 } })
                    await User.update({ email: req.session.email }, { $pull: { nices: req.body.id }, $push: { bads: req.body.id } })
                    res.json({ success: true })
                }
            } else {
                res.json({ success: false, errorCode: 1 })
            }
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

function formatPage(p) {
    page = p
    if (p == undefined) page = 1;
    else {
        for (var i = 0; i < p.length; i++) {
            if (p.charCodeAt(i) < 48 || p.charCodeAt(i) > 57) {
                page = 1
                break
            }
        }
        if (page != 1) page = Number(p)
        if (page < 1) page = 1
    }
    return page
}

module.exports.topicGet = async function (req, res) {
    try {
        var context = { isLoggedIn: false, topics: [], topic: null, entries: [], totalPage: 1, currentPage: 1, link: null, nices: [], bads: [], username: '', title: '', q: "" }
        var session = req.session
        var page = formatPage(req.query.p)
        var user = await User.findOne({ email: session.email })
        if (user != undefined) {
            context.nices = user.nices;
            context.bads = user.bads;
            context.username = user.username;
        }
        if (session.email != undefined) context.isLoggedIn = true;

        var topics = await Topic.find({}).sort("-lastUpdate").exec()
        context.topics = topics;
        var topic = await Topic.findOne({ link: req.params.topic })
        if (topic != undefined) {
            context.title = topic.topic
            context.topic = { _id: topic.id, topic: topic.topic, a: req.query.a };
            context.link = topic.link
            var count = await Entry.countDocuments({ topic: topic.id, })
            if ((page - 1) * 10 >= count) page = 1;
            context.currentPage = page;
            context.totalPage = Math.floor(count / 10) + ((count % 10) != 0 ? 1 : 0)
            var entries;
            if (req.query.a == 'dailynice') {
                entries = await Entry.find({ topic: topic.id })
                var count = 0;
                var dailyNices;
                var _entries = []
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                for (var i = 0; i < entries.length; i++) {
                    dailyNices = await DailyNices.findOne({ entry: entries[i]._id, date: { $gte: today } })
                    if (dailyNices != undefined) count = dailyNices.count
                    _entries.push({ _id: entries[i]._id, id: entries[i].id, entry: entries[i].entry, date: formatter.formatDate(entries[i].date), owner: (await User.findOne({ _id: entries[i].owner })).username, nices: count })
                }
                _entries.sort(function (x, y) {
                    if (x.nices < y.nices) return 1;
                    else if (x.nices > y.nices) return -1;
                    else if (x.date > y.date) return 1;
                    else if (x.date < y.date) return -1;
                    return 0;
                });
                context.entries = _entries.slice((page - 1) * 10, page * 10 > _entries.length ? (page - 1) * 10 + _entries.length % 10 : page * 10)
            } else {
                entries = await Entry.find({ topic: topic.id }).sort(req.query.a == "nice" ? { nices: -1, date: 1 } : "date").limit(page * 10).exec()
                for (var i = (page - 1) * 10; i < entries.length; i++) {
                    context.entries.push({ _id: entries[i]._id, id: entries[i].id, entry: formatter.formatClientEntry(entries[i].entry), date: formatter.formatDate(entries[i].date), owner: (await User.findOne({ _id: entries[i].owner })).username, nices: entries[i].nices })
                }
            }
            if (context.isLoggedIn) context.m = (await Conversation.countDocuments({ owner: user.username, "lastMessage.isRead": false })) != 0
            res.render("topic", context);
        } else res.redirect(303, '/')
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
};

module.exports.topicsGet = async function (req, res) {
    try {
        var context = {
            isLoggedIn: false,
            topics: [],
            h: true,
            title: 'başlıklar',
            username: ''
        }
        var session = req.session
        if (session.email != undefined) {
            context.isLoggedIn = true
            var user = await User.findOne({ email: session.email })
            context.username = user.username
        }
        var topics = await Topic.find({}).sort('-lastUpdate')
        context.topics = topics;
        res.render("topics", context);
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.deleteEntry = async function (req, res) {
    try {
        var session = req.session
        if (session.email == undefined) {
            res.json({ success: false, errorCode: 1 })
        } else {
            var entry = await Entry.findOne({ _id: req.body.id })
            if (entry != undefined)
                if (entry.owner == (await User.findOne({ email: session.email }))._id.toString()) {
                    await Topic.updateOne({ id: entry.topic }, { $pull: { entries: entry.id.toString() } })
                    var topic = await Topic.findOne({ id: entry.topic })
                    if (topic.entries.length == 0) {
                        await topic.remove()
                    }
                    entry.remove()
                    res.json({ success: true })
                    return
                }
            res.json({ success: false, errorCode: 1 })
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.profileGet = async function (req, res) {
    try {
        var context = {
            isLoggedIn: false,
            topics: [],
            user: null,
            _user: null,
            headEntry: {},
            activities: {},
            entries: [],
            nices: [],
            bads: [],
            title: '',
            username: ''
        }
        var session = req.session
        if (session.email != undefined) context.isLoggedIn = true;
        var topics = await Topic.find({}).sort("-lastUpdate").exec();
        var username = req.params.username.replace(/-/g, ' ').trim()
        var user = await User.findOne({ username: username })
        context.title = 'kullanıcı: ' + username
        var _user = await User.findOne({ email: session.email })
        if (context.isLoggedIn) context.username = _user.username
        if (user != undefined) {
            context.user = user;
            context._user = _user;
            context.nices = user.nices;
            context.bads = user.bads;
        }
        else {
            res.redirect(303, '/')
            return
        }
        var date = Date.now()
        var entries = await Entry.find({ owner: user._id.toString() }).sort('-date').limit(10)
        var _topic;
        for (var i = 0; i < entries.length; i++) {
            _topic = await Topic.findOne({ id: entries[i].topic })
            context.entries.push({
                _id: entries[i]._id.toString(),
                id: entries[i].id,
                entry: entries[i].entry,
                topicName: _topic.topic,
                date: formatter.formatDate(entries[i].date),
                owner: user.username,
                topicLink: _topic.link,
                topicID: _topic.id.toString()
            })
        }

        context.activities.totalEntry = await Entry.countDocuments({ owner: user._id.toString() })
        context.activities.lastMonth = await Entry.countDocuments({ owner: user._id.toString(), date: { $gte: date - 30 * 24 * 60 * 60 * 1000, $lte: date } })
        context.activities.lastWeek = await Entry.countDocuments({ owner: user._id.toString(), date: { $gte: date - 7 * 24 * 60 * 60 * 1000, $lte: date } })
        context.activities.lastDay = await Entry.countDocuments({ owner: user._id.toString(), date: { $gte: date - 1 * 24 * 60 * 60 * 1000, $lte: date } })
        _lastActivity = (await Entry.find({ owner: user._id.toString() }).sort('-date').limit(1))[0]
        if (_lastActivity != null)
            context.activities.lastActivity = formatLastActivity(_lastActivity.date)

        var headEntry = (await Entry.find({ owner: user._id.toString() }).sort('-nices').limit(1))[0]

        context.headEntry = { entry: headEntry != undefined ? headEntry.entry : "" };

        var topic = await Topic.findOne({ id: headEntry != undefined ? headEntry.topic : null })

        context.headEntry.topicName = topic != undefined ? topic.topic : ""
        context.headEntry.topicLink = topic != undefined ? topic.link : ""
        context.headEntry.topicID = topic != undefined ? topic.id.toString() : ""

        context.headEntry.date = headEntry != undefined ? formatter.formatDate(headEntry.date) : ""
        context.topics = topics;
        context.fn = formatter.formatClientEntry.bind(formatter)
        context.m = (await Conversation.countDocuments({ owner: user.username, "lastMessage.isRead": false })) != 0
        res.render("profile", context);
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

function formatLastActivity(date) {
    var now = Date.now()
    if (Math.floor((now - date) / (365 * 24 * 60 * 60 * 1000)) > 0) {
        return Math.floor((now - date) / (365 * 24 * 60 * 60 * 1000)) + ' yıl önce'
    }
    else if (Math.floor((now - date) / (30 * 24 * 60 * 60 * 1000)) > 0) {
        return Math.floor((now - date) / (30 * 24 * 60 * 60 * 1000)) + ' ay önce'
    }
    else if (Math.floor((now - date) / (7 * 24 * 60 * 60 * 1000)) > 0) {
        return Math.floor((now - date) / (7 * 24 * 60 * 60 * 1000)) + ' hafta önce'
    }
    else if (Math.floor((now - date) / (1 * 24 * 60 * 60 * 1000)) > 0) {
        return Math.floor((now - date) / (1 * 24 * 60 * 60 * 1000)) + ' gün önce'
    }
    else return 'bugün'
}

module.exports.loadMoreEntry = async function (req, res) {
    try {
        var session = req.session
        if (session.email == undefined) {
            res.json({ success: false, errorCode: 1 })
        } else {
            var username = req.body.username.replace(/-/g, ' ').trim()
            var _user = await User.findOne({ email: session.email })
            var user = await User.findOne({ username: username })
            var start = Number(req.body.start)
            var end = Number(req.body.end)
            var entries = await Entry.find({ owner: req.body.owner }).sort('-date').lean()
            var _entries = []
            var isNice = 0
            for (var i = 0; i < entries.length; i++) {
                if (_user.nices.includes(entries[i]._id.toString())) isNice = 1
                else if (_user.bads.includes(entries[i]._id.toString())) isNice = -1;
                var topic = await Topic.findOne({ id: entries[i].topic })
                _entries.push({
                    id: entries[i]._id.toString(),
                    entry: entries[i].entry,
                    topicName: topic.topic,
                    topicLink: topic.link,
                    topicID: topic.id.toString(),
                    date: formatter.formatDate(entries[i].date),
                    owner: user.username,
                    isNice: isNice
                })
            }
            res.json({ success: true, entries: _entries.slice(start, end) })
            //res.json({ success: false, errorCode: 1 })
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.messagesGet = async function (req, res) {
    try {
        var context = {
            isLoggedIn: true,
            topics: [],
            title: 'mesajlar',
            username: '',
            conversations: [],
            dateFn: formatter.formatLastActivity.bind(formatter)
        }
        var session = req.session
        if (session.email == undefined) {
            context.isLoggedIn = false;
            res.redirect(303, '/')
        } else {
            var user = await User.findOne({ email: session.email })
            context.username = user.username
            var topics = await Topic.find({}, null, { sort: '-lastUpdate' })
            context.conversations = await Conversation.find({ owner: user.username }).sort({ "lastMessage.date": -1 })
            context.topics = topics;
            context.m = (await Conversation.countDocuments({ owner: user.username, "lastMessage.isRead": false })) != 0
            context.nick = req.query.nick != undefined ? req.query.nick : ""
            res.render("messages", context);
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.autocompleteQuery = async function (req, res) {
    try {
        let result = { titles: [], nicks: [] }
        const query = req.query
        const topics = await Topic.find({ topic: { $regex: new RegExp(`(${query.q.toLowerCase().trim()})`) } }).limit(8)
        for (var i = 0; i < topics.length; ++i) {
            result.titles.push({
                _id: topics[i].id,
                topic: topics[i].topic,
                link: topics[i].link
            })
        }
        const nicks = await User.find({ username: { $regex: new RegExp(`${query.q.toLowerCase().trim()}`) } }).limit(3)
        for (var i = 0; i < nicks.length; ++i) {
            result.nicks.push({
                username: nicks[i].username
            })
        }
        res.json(result)
    } catch (error) {
        console.log("error: ", error)
    }
}

module.exports.autocompleteNick = async function (req, res) {
    try {
        let result = { nicks: [] }
        const query = req.query
        const nicks = await User.find({ username: { $regex: new RegExp(`${query.nick.toLowerCase().trim()}`) } }).limit(8)
        for (var i = 0; i < nicks.length; ++i) {
            result.nicks.push({
                username: nicks[i].username
            })
        }
        res.json(result)
    } catch (error) {
        console.log("error: ", error)
    }
}

module.exports.report = async function (req, res) {
    try {
        var session = req.session
        await Report.create({ entryID: req.body.id, owner: session.email, date: Date.now(), entry: (await Entry.findOne({id: req.body.id})).entry })
        res.json({ success: true })
    } catch (error) {
        console.log('error:', error)
        res.json({ success: false })
    }
}

module.exports.editEntryGet = async function (req, res) {
    try {
        var session = req.session
        var context = {
            isLoggedIn: isLoggedIn(req),
            topics: [],
            title: '',
            entry: '',
            topic: '',
            username: ''
        }
        if (!context.isLoggedIn) {
            res.redirect(303, '/')
        } else {
            var topics = await Topic.find({}, null, { sort: '-lastUpdate' })
            var entry = await Entry.findOne({ id: req.params.id })
            var user = await User.findOne({ email: session.email })
            if (entry && entry.owner == user._id.toString()) {
                var topic = await Topic.findOne({ id: entry.topic })
                context.topics = topics;
                context.title = `düzelt: ${topic.topic}`
                context.topic = topic
                context.entry = entry
                context.username = user.username
                context.m = (await Conversation.countDocuments({ owner: user.username, "lastMessage.isRead": false })) != 0
                res.render("editEntry", context);
            } else {
                res.redirect(303, '/')
            }
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.editEntryPost = async function (req, res) {
    try {
        var session = req.session
        if (session.email != undefined) {
            var user = await User.findOne({ email: session.email })
            var entry = await Entry.findOne({ id: req.body.id })
            var _entry = formatter.formatServerEntry(req.body.entry)
            if (entry && _entry.length != 0) {
                await entry.update({ entry: _entry })
                res.json({ success: true, link: (await Topic.findOne({ id: entry.topic })).link })
            }
        } else {
            res.json({ success: false, errorCode: 1 })
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.getMessage = async function (req, res) {
    try {
        var session = req.session
        var context = {
            isLoggedIn: isLoggedIn(req),
            topics: [],
            username: '',
            conversation: null,
            fn: formatter.formatDate.bind(formatter)
        }
        if (!context.isLoggedIn) {
            res.redirect(303, '/')
        } else {
            var topics = await Topic.find({}, null, { sort: '-lastUpdate' })
            var user = await User.findOne({ email: session.email })
            var conversation = await Conversation.findOne({ id: req.params.id })
            if (conversation) {
                if (conversation.owner == user.username) {
                    await conversation.update({ "lastMessage.isRead": true })
                    context.topics = topics
                    context.conversation = conversation.toJSON()
                    context.conversation.messages.sort(function (x, y) {
                        if (x.date > y.date) return 1
                        if (x.date < y.date) return -1
                        return 0
                    })
                    context.username = user.username
                    context.m = (await Conversation.countDocuments({ owner: user.username, "lastMessage.isRead": false })) != 0
                    res.render("message", context)
                } else {
                    res.redirect(303, '/mesaj')
                }
            } else {
                res.redirect(303, '/mesaj')
            }
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.sendMessage = async function (req, res) {
    try {
        var date = Date.now();
        var session = req.session
        if (session.email != undefined) {
            var user = await User.findOne({ email: session.email })
            var otherUser = await User.findOne({ username: req.body.username })
            if (otherUser) {
                if (otherUser.username != user.username) {
                    var message = { owner: user.username, message: req.body.message.replace(/</g, '&lt'), date: date, isRead: false }
                    console.log(message)
                    var conversation = await Conversation.findOne({ owner: user.username, other: otherUser.username })
                    if (!conversation) {
                        var datas = {
                            owner: user.username,
                            other: otherUser.username,
                            messages: [message],
                            lastMessage: message
                        }
                        conversation = await Conversation.create(datas)
                        var otherConversation = await Conversation.findOne({ other: user.username, owner: otherUser.username })
                        if (!otherConversation) {
                            var otherDatas = {
                                other: user.username,
                                owner: otherUser.username,
                                messages: [message],
                                lastMessage: message
                            }
                            otherConversation = await Conversation.create(otherDatas)
                        } else {
                            await otherConversation.update({ $push: { messages: message }, lastMessage: message })
                        }
                    } else {
                        await conversation.update({ $push: { messages: message }, lastMessage: message })
                        var otherConversation = await Conversation.findOne({ other: user.username, owner: otherUser.username })
                        if (!otherConversation) {
                            var otherDatas = {
                                other: user.username,
                                owner: otherUser.username,
                                messages: [message],
                                lastMessage: message
                            }
                            otherConversation = await Conversation.create(otherDatas)
                        } else {
                            await otherConversation.update({ $push: { messages: message }, lastMessage: message })
                        }

                    }
                    res.json({ success: true, id: conversation.id })
                } else {
                    res.json({ success: false, errorCode: 1 })
                }
            } else {
                res.json({ success: false, errorCode: 1 })
            }
        } else {
            res.json({ success: false, errorCode: 1 })
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.deleteMessages = async function (req, res) {
    try {
        var session = req.session
        if (session.email == undefined) {
            res.json({ success: false, errorCode: 1 })
        } else {
            var user = await User.findOne({ email: session.email })
            var conversation = await Conversation.findOne({ owner: user.username, other: req.body.other })
            if (conversation) {
                await conversation.remove()
                res.json({ success: true })
            } else {
                res.json({ success: false, errorCode: 1 })
            }
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/mesaj')
    }
}

module.exports.optionsGet = async function (req, res) {
    try {
        var session = req.session
        var context = {
            isLoggedIn: isLoggedIn(req),
            topics: [],
            username: '',
            conversation: null,
            fn: formatter.formatDate.bind(formatter)
        }
        if (!context.isLoggedIn) {
            res.redirect(303, '/')
        } else {
            var topics = await Topic.find({}, null, { sort: '-lastUpdate' })
            var user = await User.findOne({ email: session.email })
            context.topics = topics
            context.username = user.username
            res.render('options', context)
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.changePasswordPost = async function (req, res) {
    try {
        var session = req.session
        if (session.email != undefined) {
            var user = await User.findOne({ email: session.email })
            if (user.password == crypt.sha512(req.body.oldPassword, user.salt)) {
                if (validatePassword(req.body.password)) {
                    var salt = crypt.genRandomString(16); /** Gives us salt of length 16 */
                    var passwordData = crypt.sha512(req.body.password, salt);
                    await user.update({ salt: salt, password: passwordData })
                    res.json({ success: true })
                }
            } else {
                res.json({ success: false })
            }
        } else {
            res.redirect(303, '/')
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.changeEmailPost = async function (req, res) {
    try {
        var session = req.session
        if (session.email != undefined) {
            var user = await User.findOne({ email: session.email })
            var email = formatter.formatEmail(req.body.email)
            if (validator.validate(email)) {
                await user.update({ email: email })
                req.session.email = email
                res.json({ success: true })
            } else {
                res.json({ success: false })
            }
        } else {
            res.redirect(303, '/')
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.newPasswordGet = async function (req, res) {
    try {
        var session = req.session
        var context = {
            isLoggedIn: isLoggedIn(req),
            topics: [],
            username: '',
            title: 'parola sıfırla'
        }
        var passwordRequest = await PasswordRequest.findOne({ token: req.query.token })
        if (passwordRequest) {
            if (!passwordRequest.isUsed && Date.now() - passwordRequest.date <= 86400000) {
                var _user = await User.findOne({ username: passwordRequest.username })
                if (_user) {
                    if (context.isLoggedIn) {
                        var user = await User.findOne({ email: session.email })
                        context.username = user.username
                    }
                    var topics = await Topic.find({}, null, { sort: '-lastUpdate' })
                    context.topics = topics
                    res.render('newPassword', context)
                } else {
                    res.redirect(303, '/')
                }
            } else {
                res.redirect(303, '/')
            }
        } else {
            res.redirect(303, '/')
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.forgottenPasswordGet = async function (req, res) {
    try {
        var session = req.session
        var context = {
            isLoggedIn: isLoggedIn(req),
            topics: [],
            username: '',
        }
        var topics = await Topic.find({}, null, { sort: '-lastUpdate' })
        if (context.isLoggedIn) {
            var user = await User.findOne({ email: session.email })
            context.username = user.username
        }
        context.topics = topics
        res.render('forgottenPassword', context)
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.createPasswordRequest = async function (req, res) {
    try {
        var session = req.session
        const TokenGenerator = require('uuid-token-generator');
        const tokgen = new TokenGenerator(256, TokenGenerator.BASE62);
        if (session.email == undefined) {
            var email = formatter.formatEmail(req.body.email)
            if (validator.validate(email)) {
                var user = await User.findOne({ email: email })
                if (user != undefined) {
                    var passwordRequests = await PasswordRequest.find({ username: user.username })
                    for (var i = 0; i < passwordRequests.length; ++i) {
                        await passwordRequests[i].update({ isUsed: true })
                        console.log(passwordRequests[i])
                    }
                    var passwordRequest = await PasswordRequest.create({
                        username: user.username,
                        token: tokgen.generate()
                    })
                    sendPasswordEmail(email, passwordRequest.token)
                    res.json({ success: true })
                } else {
                    res.json({ success: false })
                }
            } else {
                res.json({ success: false })
            }
        } else {
            res.redirect(303, '/')
        }
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.newPasswordPost = async function (req, res) {
    try {
        var passwordRequest = await PasswordRequest.findOne({ token: req.query.token })
        if (passwordRequest) {
            if (!passwordRequest.isUsed && Date.now() - passwordRequest.date <= 86400000) {
                var user = await User.findOne({ username: passwordRequest.username })
                if (validatePassword(req.body.password)) {
                    var salt = crypt.genRandomString(16); /** Gives us salt of length 16 */
                    var passwordData = crypt.sha512(req.body.password, salt);
                    await user.update({ salt: salt, password: passwordData })
                    await passwordRequest.update({ isUsed: true })
                    res.json({ success: true })
                }
            } else {
                res.json({ success: false })
            }
        } else {
            res.json({ success: false })
        }
    } catch (error) {
        console.log('error:', error)
        res.json({ success: false })
    }
}

module.exports.userAgreementGet = async function (req, res) {
    try {
        var session = req.session
        var context = {
            isLoggedIn: isLoggedIn(req),
            topics: [],
            username: '',
        }
        var topics = await Topic.find({}, null, { sort: '-lastUpdate' })
        if (context.isLoggedIn) {
            var user = await User.findOne({ email: session.email })
            context.username = user.username
        }
        context.topics = topics
        res.render('userAgreement', context)
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}

module.exports.termsOfUseGet = async function (req, res) {
    try {
        var session = req.session
        var context = {
            isLoggedIn: isLoggedIn(req),
            topics: [],
            username: '',
        }
        var topics = await Topic.find({}, null, { sort: '-lastUpdate' })
        if (context.isLoggedIn) {
            var user = await User.findOne({ email: session.email })
            context.username = user.username
        }
        context.topics = topics
        res.render('termsOfUse', context)
    } catch (error) {
        console.log('error:', error)
        res.redirect(303, '/')
    }
}