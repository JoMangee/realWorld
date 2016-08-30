var restify = require('restify');
var builder = require('../Node/core/');//= require('botbuilder');
const fs = require('fs');
/*const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
    cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
};*/

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

//Basic GET
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
var bot = new builder.UniversalBot(connector, { localizerSettings: { botLocalePath: "./locale", defaultLocale: "en" } });
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye/i });
bot.beginDialogAction('help', '/help', { matches: /^help/i });

//=========================================================
// Activity Events
//=========================================================


bot.on('conversationUpdate', function (message) {
    // Check for group conversations
    if (message.address.conversation.isGroup) {
        // Send a hello message when bot is added
        if (message.membersAdded) {
            message.membersAdded.forEach(function (identity) {
                if (identity.id === message.address.bot.id) {
                    var reply = new builder.Message()
                        .address(message.address)
                        .text("Hello everyone!");
                    bot.send(reply);
                } else {
                    //if it's not us being added, we may as well greet the new person
                    var reply = new builder.Message()
                        .address(message.address)
                        .text("Welcome along %s", identity.name || ':)');
                    bot.send(reply);
                }
            });
        }

      // Send a goodbye message when bot is removed
      if (message.membersRemoved) {
            message.membersRemoved.forEach(function (identity) {
                if (identity.id === message.address.bot.id) {
                    var reply = new builder.Message()
                        .address(message.address)
                        .text("Goodbye");
                    bot.send(reply);
                }
            });
        }
    }
});

bot.on('contactRelationUpdate', function (message) {
    if (message.action === 'add') {
        var name = message.user ? message.user.name : null;
        var reply = new builder.Message()
            .address(message.address)
            .text("Hello %s... Thanks for adding me. I'm still in progress, but try 'help' if you get stuck.", name || 'there');
        bot.send(reply);
    } else {
        // delete their data
    }
});

bot.on('deleteUserData', function (message) {
    // User asked to delete their data
});

// Install First Run middleware and dialog
bot.use(builder.Middleware.firstRun({ version: 1.0, dialogId: '*:/firstRun' }));
bot.dialog('/firstRun', [
    function (session) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        }
    },
    function (session, results) {
        // We'll save the users name and send them an initial greeting. All 
        // future messages from the user will be routed to the root dialog.
        session.endDialog("Thanks %s!", session.userData.name);
    }
]);

// Locale detection middleware
bot.use({
    botbuilder: function (session, next) {
        var _loc = session.preferredLocale();
        console.log('Preferred Locale is %s', _loc);
        if (session.message.textLocale) {
            // if we have a locale with the text - use it!
            session.preferredLocale(session.message.textLocale, function () { session.send('Hello World') }, (err) => {
                session.send("Sorry I can't speak %s - will use English", session.message.textLocale);
            });
        }
        else // Use proper method to detect locale -- typing es triggers the es locale to be set
        if (/^es/i.test(session.message.text)) {
            // Set the locale for the session once its detected
            session.preferredLocale("es", function () { session.send('Hello World') },(err) => {
            });

            // Use proper method to detect locale -- typing us triggers the en-us locale to be set            
        } else if (/^us/i.test(session.message.text)) {
            // Set the locale for the session once its detected
            session.preferredLocale("en-us", function () { session.send('Hello World') }, (err) => {
            });

            // Use proper method to detect locale -- typing nz triggers the en-nz locale to be set
        } else if (/^nz/i.test(session.message.text)) {
            // Set the locale for the session once its detected
            session.preferredLocale("en-nz", function () { session.send('Hello World') }, (err) => {
            });
        } else {
            // By not setting the preferred locale, we will fallback to the default (en in this case) 
            console.log('Locale fell out - using %s',_loc);
        }
        if (_loc != session.preferredLocale()) {
            console.log('Locale changed from %s to %s in conversation %s', _loc, session.preferredLocale(), session.message.address.conversation.id);
            session.send("Locale now set to %s", session.preferredLocale());
        }
        next();
    }
});


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
        console.log('Message in');
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
    function (session, message) {
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


bot.dialog('/help', [
    function (session) {
        session.endDialog("Global commands that are available anytime:\n\n* **change name** - changes what bot calls you \n* **goodbye** - End this conversation.\n* **help** - Displays these commands.");
    }
]);