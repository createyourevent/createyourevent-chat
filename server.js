var http = require("http");
var path = require("path");
var express = require("express");
var cors = require('cors');
var bodyParser = require('body-parser');
var formidable = require('formidable');
var fs = require('fs');

var app = express();

app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

/*
// Express CORS setup
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'https://createyourevent.org');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});
*/

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "https://createyourevent.org"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var server = app.listen(3000);

// var io = require('socket.io')({transports: ['websocket'], upgrade: false}).listen(server);

const socketio = require('socket.io');

const io = socketio(server, {
  cors: {
    origin: '*',
  }
});

//var path = __dirname + '/views/';

var usersCollection = [];

// Express routes
app.set("view engine", "vash");

app.use("/Uploads", require('express').static(path.join(__dirname, 'Uploads')));

app.get("*",function(req, res){
  res.render("index");
});

app.post("/listFriends",function(req, res){
  var clonedArray = usersCollection.slice();

  // Getting the userId from the request body as this is just a demo
  // Ideally in a production application you would change this to a session value or something else
  var i = usersCollection.findIndex(x => x.participant.id == req.body.userId);

  clonedArray.splice(i,1);

  res.json(clonedArray);
});

app.post('/uploadFile', function (req, res){
  let form = new formidable.IncomingForm();
  let ngChatDestinataryUserId;

  if (!fs.existsSync("/Uploads")){
    fs.mkdirSync("/Uploads");
  }

  form.parse(req)
  .on('field', function (name, field) {
    // You must always validate this with your backend logic
    if (name === 'ng-chat-participant-id')
      ngChatDestinataryUserId = field;
  })
  .on('fileBegin', function (name, file){
      file.path = `${__dirname}/Uploads/${file.name}`;
  })
  .on('file', function (name, file){
    console.log('Uploaded ' + file.name);

    // Push socket IO status
    let message = {
      type: 2, // MessageType.File = 2
      //fromId: ngChatSenderUserId, fromId will be set by the angular component after receiving the http response
      toId: ngChatDestinataryUserId,
      message: file.name,
      mimeType: file.type,
      fileSizeInBytes: file.size,
      downloadUrl:  `http://localhost:3000/Uploads/${file.name}`
    };

    console.log("Returning file message:");
    console.log(message);

    res.status(200);
    res.json(message);
  });
});

// Socket.io operations
io.on('connection', function(socket){
  console.log('A user has connected to the server.');

  socket.on('reloadPage', function(userId) {
    var i = usersCollection.find(x => x.uID === userId);
    if(i !== undefined) {
      i.sID = socket.id;
    }
  });

  socket.on('timestamp', function(userId) {
    var i = usersCollection.find(x => x.uID === userId);
    if(i !== undefined) {
      i.ts = new Date();
    }
  });

  socket.on('join', function(username, userId) {
        console.log("join");
        var i = usersCollection.find(x => x.uID === userId);
        if( i == undefined) {
          usersCollection.push(
            {uID: userId,
            participant: {
                id: userId, // Assigning the socket ID as the user ID in this example
                displayName: username,
                status: 0, // ng-chat UserStatus.Online,
                avatar: null
            },
            sID: socket.id,
            ts: new Date()
           });
        }else {
          i.sID = socket.id;
          i.ts = new Date();
        }

      //socket.broadcast.emit("friendsListChanged", usersCollection);
      console.log(username + " has joined the chat room.");

    });

    // On disconnect remove this socket client from the users collection
    socket.on('end', function(id) {
      console.log('User end!');

      var i = usersCollection.findIndex(x => x.uID === id);
      usersCollection.splice(i, 1);

      //socket.broadcast.emit("friendsListChanged", usersCollection);
      socket.broadcast.emit('userLoggedOf', id);
    });

  socket.on('sendMessage', function(message, messageId){
    console.log("Message received:");

     var u = usersCollection.find(x => x.uID === message.toId);
     var v = usersCollection.find(x => x.uID === message.fromId);
      io.to(u.sID).emit("messageReceived", {
        user: v.participant,
        message: message
      }, messageId);
      console.log("Message dispatched.");
  });

});


setInterval(function() {
  for(var i = 0; i < usersCollection.length; i++) {
    if(new Date().getTime() - usersCollection[i].ts.getTime() >= 3 * 60 * 1000) {
      usersCollection.splice(i, 1);
    }
  }
}, 60 * 1000);

