var express = require('express'),
    app = express(),
    ejsLayouts = require('express-ejs-layouts'),
    PORT = process.env.PORT || 5000,
    path = require('path'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    ejsLayouts = require('express-ejs-layouts'),
    homeRouter = require('./app_server/route/homeRouter'),
    cookieParser = require('cookie-parser'),
    Formatter = require('./app_server/control/Formatter')
    Topic = require('./app_server/models/topic')
    db = require('./app_server/models/db');
    
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './app_server/views'));

app.use(ejsLayouts);
app.use(cookieParser())

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const expressip = require('express-ip');
app.use(expressip().getIpInfoMiddleware);

const requestIp = require('request-ip');
app.use(requestIp.mw())

app.use(session({
    secret: '*************',
    cookie: { maxAge: 86400000 },
    store: new (require('express-sessions'))({
        storage: 'mongodb',
        instance: mongoose, // optional
        host: 'ds119802.mlab.com', // optional
        port: 19802, // optional
        db: 'anowriters', // optional
        collection: 'sessions', // optional
        expire: 86400 // optional
    }),
    resave: false,
    saveUninitialized: false
}));

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use('/', homeRouter);

app.listen(PORT, () => console.log(`Listening on ${PORT}`));