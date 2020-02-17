var crypto = require('crypto'),
  hash = crypto.createHash('md5');
algorithm = 'rc2-40-cbc',
  password = 'd6F3Efeq';

module.exports.encrypt = function (text) {
  var cipher = crypto.createCipher(algorithm, password)
  var crypted = cipher.update(text, 'utf8', 'hex')
  crypted += cipher.final('hex');
  return crypted;
}

module.exports.decrypt = function (text) {
  var decipher = crypto.createDecipher(algorithm, password)
  var dec = decipher.update(text, 'hex', 'utf8')
  dec += decipher.final('utf8');
  return dec;
}

module.exports.encode_utf8 = function (s) {
  return unescape(encodeURIComponent(s));
}

module.exports.decode_utf8 = function (s) {
  return decodeURIComponent(escape(s));
}

module.exports.hash = function (data) {
  return require('crypto').createHash('md5').update(data).digest('hex');
}

module.exports.createToken = function () {
  var a = Math.random();
  var b = Math.random();
  var c = Math.random();
  a = module.exports.hash(a.toString().slice(2, a.length));
  b = module.exports.hash(b.toString().slice(2, b.length));
  c = module.exports.hash(c.toString().slice(2, c.length));
  token = a + b + c;
  return token;
}

module.exports.createImageToken = function () {
  var a = Math.random();
  a = module.exports.hash(a.toString().slice(2, a.length));
  token = a;
  return token;
}

module.exports.genRandomString = function (length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') /** convert to hexadecimal format */
    .slice(0, length);   /** return required number of characters */
};

module.exports.sha512 = function (password, salt) {
  var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  var value = hash.digest('hex');
  return value;
};

module.exports.saltHashPassword = function (salt, userpassword) {
  var passwordData = crypt.sha512(userpassword, salt);
  return passwordData.passwordHash;
}