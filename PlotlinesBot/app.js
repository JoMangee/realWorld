var restify = require('restify');
var builder = require('botbuilder');
/*const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
    cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
};*/
//Basis REST


//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

//Basic REST
server.get("/", function (req, res, next) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('This is Plotlines Bot server - nothing to see here\n');
    return next();
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

var intents = new builder.IntentDialog();
bot.dialog('/', intents);

intents.matches(/change(.*)name/i, [
    function (session) {
        session.beginDialog('/profile');
    },
    function (session, results) {
        session.send('Ok... Changed your name to %s', session.userData.name);
    }
]);

intents.matches(/cricket(.*)result/i, [
    function (session) {
        session.beginDialog('/cricket');
    },
    function (session, results) {
        session.send('Ok... I\'ll keep an eye out for those %s', session.userData.name);
    }
]);


intents.onDefault([
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
    }
]);

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);

bot.dialog('/cricket', [
    function (session) {
        builder.Prompts.text(session, 'Which cricket teams are you interested in?');
    },
    function (session, results) {
        session.userData.cricket = results.response;
        session.endDialog();
    }
]);