require('dotenv').config();
require ('./models/connection')
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var briefsRouter = require('./routes/briefs');
var profilsRouter = require('./routes/profils');
var messagesRouter = require('./routes/messages')
var app = express();

const fileUpload = require('express-fileupload');
app.use(fileUpload());

const cors = require('cors');
app.use(cors());

const corsOptions = {
    origin: 'https://brief-creativ-frontend.vercel.app',
    methods: ['POST'],
    allowedHeaders: ['Authorization'],
  };
  
  app.options('https://brief-creativ-backend-pskunk.vercel.app/profils/avatar', cors(corsOptions));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/briefs', briefsRouter);
app.use('/profils', profilsRouter);
app.use('/messages', messagesRouter);

module.exports = app;
