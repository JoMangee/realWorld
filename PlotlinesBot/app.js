console.log('Booting...');
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

    if (req.accepts('text/html')) {
        var body = '<html><head><title>Plotline Bot</title></head>\
        <body><p>This is Plotlines Bot server<br/>\
            <script>\
            window.fbAsyncInit = function () {\
            FB.init({\
                appId: "APP_ID",\
                xfbml: true,\
                version: "v2.6"\
            });\
            \
        };\
        \
        (function (d, s, id) {\
            var js, fjs = d.getElementsByTagName(s)[0];\
            if (d.getElementById(id)) { return; }\
            js = d.createElement(s); js.id = id;\
            js.src = "//connect.facebook.net/en_US/sdk.js";\
            fjs.parentNode.insertBefore(js, fjs);\
        } (document, \'script\', \'facebook-jssdk\'));\
        \
        </script>\
        <a href="https://www.messenger.com/t/174037992643608"><img src="https://facebook.botframework.com/Content/MessageUs.png"></a><br/>\
        <a href="https://join.skype.com/bot/5fa78453-3a34-4051-b666-56cc1910a43f"><img src="https://dev.botframework.com/Client/Images/Add-To-Skype-Buttons.png"/></a><br/>\
       </body></html>';
         res.writeHead(200, {
            'Content-Length': Buffer.byteLength(body),
            'Content-Type': 'text/html'
        });
        res.write(body);
        res.end();
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('This is Plotlines Bot server - nothing to see here\n');
    }
    return next();
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector, { localizerSettings: { botLocalePath: "./locale", defaultLocale: "en" } });
server.post('/api/messages', connector.listen());

console.log('Server up...');
//=========================================================
// Bots Global Actions
//=========================================================

bot.endConversationAction('goodbye', 'Goodbye :)', { matches: /^goodbye(.*)/i });
bot.beginDialogAction('help', '/help', { matches: /(.*)help(.*)/i });
bot.beginDialogAction('install', '/install', { matches: /(.*)install(.*)/i });
bot.beginDialogAction('alarm', '/alarm', { matches: /(.*)alarm(.*)/i });
bot.beginDialogAction('endaction', '/endaction', { matches: /(cancel|end|stop|quit)/i });

//=========================================================
// Activity Events
//=========================================================
bot.on('typing', function (message) { console.log("I see typing"); });
bot.on('conversationUpdate', function (message) {
    console.log("Conversation update");
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
                } else {
                    //if it's not us being added, we may as well greet the new person
                    var reply = new builder.Message()
                        .address(message.address)
                        .text("Bye %s", identity.name || ' :|');
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
            console.log('Text Locale is %s', session.message.textLocale);
            session.preferredLocale(session.message.textLocale, function () { session.send('greeting') }, (err) => {
                session.send("Sorry I can't speak %s - will use English", session.message.textLocale);
            });
        }
        else // Use proper method to detect locale -- typing es triggers the es locale to be set
        if (/^es/i.test(session.message.text)) {
            // Set the locale for the session once its detected
            session.preferredLocale("es", function () { session.send('greeting') },(err) => {
            });

            // Use proper method to detect locale -- typing us triggers the en-us locale to be set            
        } else if (/^us/i.test(session.message.text)) {
            // Set the locale for the session once its detected
            session.preferredLocale("en-us", function () { session.send('greeting') }, (err) => {
            });

            // Use proper method to detect locale -- typing nz triggers the en-nz locale to be set
        } else if (/^nz/i.test(session.message.text)) {
            // Set the locale for the session once its detected
            session.preferredLocale("en-nz", function () { session.send('greeting') }, (err) => {
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

intents.matches(/cricket(.*)(result|score)/i, [
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
        var greet = session.localizer.gettext(session.preferredLocale(), "greeting"); 
        greet = greet.charAt(0).toUpperCase() + greet.slice(1);
        session.send("%s %s!", greet ,session.userData.name || "there"); 
    }
]);

bot.dialog('/profile', [
    function (session, message) {
        if (!session.userData.name) {
            builder.Prompts.text(session, 'Hi! What is your name?');
        }

    },
    function (session, results, next) {
        if (results.response) {
            session.userData.name = results.response;
        }
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
        session.endDialog("Some commands that are available:\n\n* **change name** - changes what bot calls you \n* **install** - shows install links\n* **goodbye** - End this conversation.\n* **help** - Displays these commands.");
    }
]);

bot.dialog('/endaction', [
    function (session) {
        session.endDialog("Ok, I've stopped that.");
    }
]);

bot.dialog('/install', [
    function (session) {
        session.send("Do you want a challenge...");
        session.sendTyping();
        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                    .title("Realistic Ball Physics")
                    .text("Smashing Cricket!")
                    .images([
                        builder.CardImage.create(session, "https://lh3.googleusercontent.com/flFFJJcX0z0CNaMzlU5jccrWaJTkOcAv4MzD9gYFOi2Zg_2A_GqbFGpDOebwf0Z-tNc=h320")
                            .tap(builder.CardAction.showImage(session, "https://lh3.googleusercontent.com/flFFJJcX0z0CNaMzlU5jccrWaJTkOcAv4MzD9gYFOi2Zg_2A_GqbFGpDOebwf0Z-tNc=h900")),
                    ]),
                new builder.HeroCard(session)
                    .title("Super Slow Motion")
                    .text("Smashing Cricket!")
                    .images([
                        builder.CardImage.create(session, "https://lh3.googleusercontent.com/SMZ8eMDBDJq0j2UHDA777Gkip1mh2Knrcwbu4_Yg_vp2PXFLuSA00Hqp50mKZZC8CDs=h320")
                            .tap(builder.CardAction.showImage(session, "https://lh3.googleusercontent.com/SMZ8eMDBDJq0j2UHDA777Gkip1mh2Knrcwbu4_Yg_vp2PXFLuSA00Hqp50mKZZC8CDs=h900")),
                    ]),
                new builder.HeroCard(session)
                    .title("Fabulous Animations")
                    .text("Smashing Cricket!")
                    .images([
                        builder.CardImage.create(session, "https://lh3.googleusercontent.com/p3qA71O430pamCA5IkDl0ianeYlAyYbjyhDFEzZwqjuMHpLL9FuSyyL1NUO60mkhpg=h320")
                            .tap(builder.CardAction.showImage(session, "https://lh3.googleusercontent.com/p3qA71O430pamCA5IkDl0ianeYlAyYbjyhDFEzZwqjuMHpLL9FuSyyL1NUO60mkhpg=h900")),
                    ]),
                new builder.HeroCard(session)
                    .title("Hit 4's and 6's!")
                    .text("Smashing Cricket!")
                    .images([
                        builder.CardImage.create(session, "https://lh3.googleusercontent.com/xBxSR1g9afEy2XYPKjiTYvaPiisSHk10UEkobcsaNi3kYVYdtpV9tKIVOJ5UM5DqkiQh=h320")
                            .tap(builder.CardAction.showImage(session, "https://lh3.googleusercontent.com/xBxSR1g9afEy2XYPKjiTYvaPiisSHk10UEkobcsaNi3kYVYdtpV9tKIVOJ5UM5DqkiQh=h900")),
                    ]),
                new builder.HeroCard(session)
                    .title("See how far you Go")
                    .text("Smashing Cricket!")
                    .images([
                        builder.CardImage.create(session, "https://lh3.googleusercontent.com/Wq34bbXD_mKmQz_Vk3RyvK9EWrFsYB34s49TcnhKkJNpxo6bQlWgIGUo9V1WrP4hmT8=h320")
                            .tap(builder.CardAction.showImage(session, "https://lh3.googleusercontent.com/Wq34bbXD_mKmQz_Vk3RyvK9EWrFsYB34s49TcnhKkJNpxo6bQlWgIGUo9V1WrP4hmT8=h900")),
                    ])
            ]);

        session.send(msg);
        msg = new builder.Message(session)
            .textFormat(builder.TextFormat.markdown)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Smashing Cricket")
                    .subtitle("Fun Realistic Cricket Simulation")
                    .text("**Smashing Cricket** - the best free 3D cricket simulation game for your mobile devices with great graphics and realistic physics. Are you a cricket fan? and you love batting? Keep smashing the ball without getting out. See how far you can go. Free to play. Realistic ball physics. Great 3D graphics!")
                    .images([
                        builder.CardImage.create(session, "https://lh3.googleusercontent.com/Rl8LUGgaRvShxPmtN1idKk3ybGFSjLTADhgh-N9nPI7lgCrX-v3chZtJVTrfS8UQd-A=w200")
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://itunes.apple.com/us/app/smashing-cricket-fun-realistic/id1087690204?mt=8", "iOS"),
                        builder.CardAction.openUrl(session, "https://play.google.com/store/apps/details?id=com.athanggames.smashingcricket", "Android"),
                        builder.CardAction.openUrl(session, "smashingcricket://open", "Play Now")
                    ])
            ]);
        session.endDialog(msg);
    }
]);



// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
var model = process.env.model || 'https://api.projectoxford.ai/luis/v1/application?id=c413b2ef-382c-45bd-8ff0-f76d60e2a821&subscription-key=6d0966209c6e4f6b835ce34492f3e6d9&q=';
var recognizer = new builder.LuisRecognizer(model);
var alarmdialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/alarm', alarmdialog);

// Add intent handlers
alarmdialog.matches('builtin.intent.alarm.set_alarm', [
    function (session, args, next) {
        // Resolve and store any entities passed from LUIS.
        var title = builder.EntityRecognizer.findEntity(args.entities, 'builtin.alarm.title');
        var time = builder.EntityRecognizer.resolveTime(args.entities);
        var alarm = session.dialogData.alarm = {
            title: title ? title.entity : null,
            timestamp: time ? time.getTime() : null
        };

        // Prompt for title
        if (!alarm.title) {
            builder.Prompts.text(session, 'What would you like to call your alarm?');
        } else {
            next();
        }
    },
    function (session, results, next) {
        var alarm = session.dialogData.alarm;
        if (results.response) {
            alarm.title = results.response;
        }

        // Prompt for time (title will be blank if the user said cancel)
        if (alarm.title && !alarm.timestamp) {
            builder.Prompts.time(session, 'What time would you like to set the alarm for?');
        } else {
            next();
        }
    },
    function (session, results) {
        var alarm = session.dialogData.alarm;
        if (results.response) {
            var time = builder.EntityRecognizer.resolveTime([results.response]);
            alarm.timestamp = time ? time.getTime() : null;
        }

        // Set the alarm (if title or timestamp is blank the user said cancel)
        if (alarm.title && alarm.timestamp) {
            // Save address of who to notify and write to scheduler.
            alarm.address = session.message.address;
            alarms[alarm.title] = alarm;

            // Send confirmation to user
            var date = new Date(alarm.timestamp);
            var isAM = date.getHours() < 12;
            session.send('Creating alarm named "%s" for %d/%d/%d %d:%02d%s',
                alarm.title,
                date.getMonth() + 1, date.getDate(), date.getFullYear(),
                isAM ? date.getHours() : date.getHours() - 12, date.getMinutes(), isAM ? 'am' : 'pm');
        } else {
            session.send('Ok... no problem.');
        }
    }
]);

alarmdialog.matches('builtin.intent.alarm.delete_alarm', [
    function (session, args, next) {
        // Resolve entities passed from LUIS.
        var title;
        var entity = builder.EntityRecognizer.findEntity(args.entities, 'builtin.alarm.title');
        if (entity) {
            // Verify its in our set of alarms.
            title = builder.EntityRecognizer.findBestMatch(alarms, entity.entity);
        }

        // Prompt for alarm name
        if (!title) {
            builder.Prompts.choice(session, 'Which alarm would you like to delete?', alarms);
        } else {
            next({ response: title });
        }
    },
    function (session, results) {
        // If response is null the user canceled the task
        if (results.response) {
            delete alarms[results.response.entity];
            session.send("Deleted the '%s' alarm.", results.response.entity);
        } else {
            session.send('Ok... no problem.');
        }
    }
]);

alarmdialog.onDefault(builder.DialogAction.send("Sorry, I missed that! \nIn alarm  mode I can only set or delete alarms.. \nType **cancel** if you need"));


// Very simple alarm scheduler
var alarms = {};
setInterval(function () {
    var now = new Date().getTime();
    for (var key in alarms) {
        var alarm = alarms[key];
        if (now >= alarm.timestamp) {
            var msg = new builder.Message()
                .address(alarm.address)
                .text("It's time for your '%s' alarm.", alarm.title);
            bot.send(msg);
            delete alarms[key];
        }
    }
}, 15000);

var request = require('request');
var cheerio = require('cheerio');
server.get('/scrape', function (req, res) {

    url = 'http://m.cricbuzz.com/cricket-match/live-scores';
    // http://insta7.com/Cricket.aspx 
    request = request.defaults({ jar: true })

    request(url, function (error, response, html) {
        if (!error && response.statusCode == 200) {
            var $ = cheerio.load(html);

            var all, title, status, toss, motm, scores;
            var scraped = [];
            var json = { all: "", title: "", toss: "", status: "", motm: "", scores: "" };
            $('h4.cb-list-item').filter(function () {
                var data = $(this);
                all = data.text();
                title = data.text();
                json.all = all;
                json.title = title;
                console.log("Match: %s", title);
                $('.cbz-ui-status').filter(function () {
                    var data = $(this);
                    status = data.text();

                    json.status = status;
                    console.log(" Status: %s", status);
                    $('.ui-allscores').filter(function () {
                        var data = $(this);
                        scores = data.text();
                        json.scores = scores;
                        console.log(" Scores: %s", scores);
                        scraped.push(json);
                    })
                })
                
            })
            console.log(scraped);
        }

        // To write to the system we will use the built in 'fs' library.
        // In this example we will pass 3 parameters to the writeFile function
        // Parameter 1 :  output.json - this is what the created filename will be called
        // Parameter 2 :  JSON.stringify(json, null, 4) - the data to write, here we do an extra step by calling JSON.stringify to make our JSON easier to read
        // Parameter 3 :  callback function - a callback function to let us know the status of our function

        fs.writeFile('output.json', JSON.stringify(json, null, 4), function (err) {

            console.log('File successfully written! - Check your project directory for the output.json file');

        })

        // Finally, we'll just send out a message to the browser reminding you that this app does not have a UI.
        res.send('Check your console!')

    });
})