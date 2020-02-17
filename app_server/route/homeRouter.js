var express = require('express'),
    router = express.Router(),
    homeController = require('../control/homeController');
const rateLimit = require("express-rate-limit");
const entryLimiter = rateLimit({
    windowMs: 1 * 10 * 1000, // 1 minute
    max: 1
});
const topicLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1
});
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20
});
const deleteLimiter = rateLimit({
    windowMs: 1 * 5 * 1000, // 5 seconds
    max: 1
});
const niceLimiter = rateLimit({
    windowMs: 1 * 30 * 1000, // 30 seconds
    max: 10
});
const seeMoreLimiter = rateLimit({
    windowMs: 1 * 5 * 1000, // 5 seconds
    max: 1
});
const reportLimiter = rateLimit({
    windowMs: 1 * 5 * 1000, // 5 seconds
    max: 1
});

router.get('/', homeController.homeGet);
router.get('/kayit', homeController.signupGet);
router.post('/kayit', signupLimiter, homeController.signupPost);
router.get('/giris', homeController.signinGet);
router.get('/terk', homeController.logout)
router.get('/aktivasyon/:emailToken', homeController.verifyEmail)
router.post('/giriskontrol', homeController.loginCheck, homeController.loginPost)
router.get('/cikis', homeController.logout);
//router.get('/yeni-baslik', homeController.newTopicGet);
//router.post('/yeni-baslik', topicLimiter, homeController.newTopicPost);
router.get('/mesaj', homeController.messagesGet)
router.post('/mesaj/sil', homeController.deleteMessages)
router.get('/mesaj/:id', homeController.getMessage)
router.post('/mesaj/yeni', homeController.sendMessage)
router.get('/basliklar', homeController.topicsGet)
router.get('/entry/duzelt/:id', homeController.editEntryGet)
router.post('/entry/duzelt', homeController.editEntryPost)
router.get('/ayarlar', homeController.optionsGet)
router.post('/yeni-girdi', entryLimiter, homeController.newEntryPost)
router.post('/parola-degistir', homeController.changePasswordPost)
router.post('/eposta-degistir', homeController.changeEmailPost)
router.get('/parola-sifirla', homeController.forgottenPasswordGet)
router.post('/parola-sifirla', homeController.createPasswordRequest)
router.get('/parola-sifirla/yeni-parola', homeController.newPasswordGet)
router.post('/parola-sifirla/yeni-parola', homeController.newPasswordPost)
router.get('/kullanici-sozlesmesi', homeController.userAgreementGet)
router.get('/kullanim-kosullari', homeController.termsOfUseGet)
router.post('/begen', niceLimiter, homeController.nice)

router.post('/entry-sil', deleteLimiter, homeController.deleteEntry)
router.get('/biri/:username', homeController.profileGet)
router.post('/daha-fazla-entry', seeMoreLimiter, homeController.loadMoreEntry)

router.post('/sikayet', reportLimiter, homeController.report)
router.get('/autocomplete/query', homeController.autocompleteQuery)
router.get('/autocomplete/nick', homeController.autocompleteNick)
router.get('/:topic--:id', homeController.topicGet)
router.get('/:topic', homeController.topicGet)
router.get('/*', function (req, res) { res.redirect(303, '/') })

module.exports = router;