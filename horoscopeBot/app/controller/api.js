var settings      = require('../config/settings');
var apiController = require('../controller/api');
var User          = require('../model/user');
var request       = require('request');
var express       = require('express');
var router        = express.Router();


// Global context var
var currentSenderID;
var waitingForDeliveryID = 0;
var subscriptionStatus = "Unsubscribe";
var userSign;

// Connect to our database


exports.verifyToken = function(req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
          req.query['hub.verify_token'] === settings.facebook_challenge ) {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
      } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.send({ "error": "Permission denied", "message" : "Sorry this is restricted area!"});
    }
};

exports.handleEvents = function(req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function(pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function(messagingEvent) {
                if (messagingEvent.optin) {
                    receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    receivedMessage(messagingEvent);
                } else if( messagingEvent.postback){
                    receivedPushback(messagingEvent);
                } else {
                    // console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });

        // Assume all went well.
        // You must send back a 200, within 20 seconds, to let us know you've
        // successfully received the callback. Otherwise, the request will time out.
        res.sendStatus(200);
    }
};

// Receiving the message
function receivedMessage(event) {

    var senderID          = event.sender.id;
    var recipientID       = event.recipient.id;
    var timeofMessage     = event.timestamp;
    var message           = event.message;
    currentSenderID       = event.sender.id;

    console.log(JSON.stringify(message));

    // Filter what we really want
    var messageText       = event.message.text;
    var messageAttachment = event.message.attachment;

    if (messageText == "Get Started") {
        showListOfSigns();
        return;
    }
    if (messageText) {
        messageText = messageText.toLowerCase();
        switch (messageText) {

            case "list":
            case "opt":
            case "option":
                showListOfSigns();
                break;

            case "leo":
            case "leoo":
                subscribedUser( senderID, "leo");
                break;

            case "ari":
            case "arie":
            case "aries":
            case "ariess":
                subscribedUser( senderID, "aries");
                break;

            case "taurus":
            case "tau":
            case "taur":
                subscribedUser( senderID, "taurus");
                break;

            case "gemini":
            case "gem":
            case "gemi":
            case "gemini":
                subscribedUser( senderID, "gemini");
                break;

            case "can":
            case "canc":
            case "cancer":
                subscribedUser( senderID, "cancer");
                break;

            case "pisces":
            case "pis":
            case "pisc":
                subscribedUser( senderID, "pisces");
                break;

            case "aquarius":
            case "aqu":
            case "aqua":
                subscribedUser( senderID, "aquarius");
                break;

            case "libra":
            case "lib":
            case "libr":
                subscribedUser( senderID, "libra");
                break;

            case "virgo":
            case "vir":
            case "virg":
                subscribedUser( senderID, "virgo");
                break;

            case "scorpio":
            case "sco":
            case "scor":
                subscribedUser( senderID, "scorpio");
                break;

            case "sagittarius":
            case "sag":
            case "sagi":
                subscribedUser( senderID, "sagittarius");
                break;

            case "capricorn":
            case "cap":
            case "capr":
                subscribedUser( senderID, "capricorn");
                break;

            case "/unsubscribe":
            case "unsubscribe":
            case "stop subscription":
                unsubscribe( senderID );
                break;

            case "stats":
            case "status":
                subscribeStatus( senderID );
                break;

            case "set":
                _defaultMessageSender( senderID, "Please enter a new sign: ");
                break;

            default:
                _defaultMessageSender(senderID, "Sorry unable to recognized the words please type again or select signs.");
        }
    } else if (messageAttachment) {
        _defaultMessageSender(senderID, "Message with attachment received");
    }
}

// // Send structure message with buttons
function receivedPushback( event ) {

    console.log(event);
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeofMessage = event.timestamp;
    var payload = event.postback.payload;
    var data = payload.toLowerCase();

    if(data == 'status') {
        subscribeStatus( senderID );
    } else if (data == 'unsubscribe') {
        unsubscribe( senderID );
    }

}

// Subcribe our user
function subscribedUser( userId, userSign ){
    // Create new User instance
    var newUser = new User({
      fb_id: userId,
      user_sign: userSign
    });

    console.log("Before SenderID:" + userId + "Before Sign:" + userSign );

    // Find user
    User.findOneAndUpdate( {fb_id: userId }, { fb_id: userId, user_sign: userSign }, { upsert: true}, function(err, user){
        if (err) {
            console.log( "Updating error: ", err );
            _defaultMessageSender( userId, "There was an error subscribing you");
        } else {
            console.log("User has been saved!" + newUser.user_sign);
            _defaultMessageSender( userId, "You have subscribed to " + newUser.user_sign );
        }
    });
}

// Unsubcribed user
function unsubscribe( userId ){
    User.findOneAndRemove({ fb_id: userId }, function( err, user){
        // Remove users from dabase
        if(err){
            _defaultMessageSender( userId, "Error deleting the user " + user.fb_id );
        } else {
            _defaultMessageSender( userId, "Unsubscribe has been successful.");
        }
    });
}

function subscribeStatus( userId ) {
    User.findOne( { fb_id: userId }, function(err, user) {
        var subscribeStatus = false;
        if(err) {
            _defaultMessageSender( userId, "Sorry error found!");
        } else {
            if ( user != null) {
                subscribeStatus = true;
                subscribeStatus = "You are currenthly subscribed to the sign: " + user.user_sign;
                _defaultMessageSender( userId, subscribeStatus );
            }
            else {
                _defaultMessageSender( userId, "You are currenty not subscribed to our daily horoscope" );
            }
        }
    });
}

// Set user signs
function setSign( userId, userSign ) {
    User.findOneAndUpdate({ fb_id: currentSenderID }, { fb_id: currentSenderID, user_sign: userSign}, function(err, user) {
        if(err) {
            _defaultMessageSender( currentSenderID, "Sorry something went wrong!" );
        } else {
            _defaultMessageSender( user.fb_id, user.user_sign );
        }
    });
}

// Send out our daily horoscope
function _sendHoroscope( recipientId, horoscopeMessage ) {

    // Make sure that our file does not exceeds 320 char
    // This is prior to facebook text limitation
    // If we don't handle it properly facebook returns an error
    var messageText = chunkFile( horoscopeMessage, 250);

    if( messageText ){
        _defaultMessageSender( recipientId, messageText[0] );
        setTimeout(function(){
            _defaultMessageSender( recipientId, messageText[1]);
        }, 1000);
    }
}


// Send our daily horoscope here
exports.sendDailyHoroscope = function ( recipientId, sign ) {

    _defaultMessageSender( recipientId, "Here is today's horoscope for " + sentenceCase( sign ), false);

    request({
        url: "http://hscpcdn.jaredco.com/" + sign + '-' + getTodaysDate() + '.txt',
        method: 'GET',
        encoding: 'utf8',
        headers: {
            'Content-Type': 'text/html'
        }
    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var currentHoroscope = JSON.parse( JSON.stringify(body) );

            // Send our daily horoscope here
            _sendHoroscope( recipientId, currentHoroscope );

        } else {
            console.log("This is callback response: ", error);
        }
    });
};


// Show list of signs
function showListOfSigns( ) {
    var message = {
        recipient: {
            id: currentSenderID,
        },
        message: {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Please tell me your signs?",
                        "subtitle": "Just type the first three characters of the sing eg: ari for aries",
                        "image_url": "http://hscpcdn.jaredco.com/zodiac-dates.png",
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Status",
                                "payload": "status"
                            },
                             {
                                "type": "postback",
                                "title": "Unsubscribe",
                                "payload": "unsubscribe"
                            }
                        ]
                    }]
                }
            }
        }
    };
    callSendAPI(message);
}

// Sentence Case
function sentenceCase(str) {
    if (str === null || str === '') {
        return false;
    } else {
        str = str.toString();
    }
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

// Just get the current date
function getTodaysDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var year = today.getFullYear() + "";
    var yy = year.substring(2, 4);
    if (dd < 10) {
        dd = '0' + dd;
    }
    if (mm < 10) {
        mm = '0' + mm;
    }
    var todayTxt = yy + "-" + mm + "-" + dd;
    return todayTxt;
}

// This is our default message
function _defaultMessageSender(recipientId, messageText) {
    var message = {
        recipient: {
            id: recipientId,
        },
        message: {
            text: messageText
        }
    };
    callSendAPI(message);
}

// This is our welcome screen message
function welcomeMessage( welcomeText ) {
    var message = {
        "setting_type": "greeting",
        "greeting": {
            "text": welcomeText
        }
    };
    callSendAPI(message);
}


function chunkFile(text, limit) {
    var lines = [];
    while (text.length > limit) {
        var chunk = text.substring(0, limit);
        var lastWhiteSpace = chunk.lastIndexOf(' ');
        if (lastWhiteSpace !== -1) {
            limit = lastWhiteSpace;
        }
        lines.push(chunk.substring(0, limit));
        text = text.substring(limit + 1);
    }
    lines.push(text);
    return lines;
}
// Send call API
function callSendAPI(messageData) {
    request({
        uri: settings.facebook_message_endpoint,
        qs: {
            access_token: settings.facebook_page_token
        },
        method: 'POST',
        json: messageData

    }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;
            console.log("Successfully sent generic message with id %s to recipient %s",
                messageId, recipientId);
        } else {
            console.error("Unable to send message.");
            console.error(response);
            console.error(error);
        }
    });
}
