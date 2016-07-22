var express = require('express');
var request = require('request');
var router = express.Router();

var PAGE_ACCESS_TOKEN = 'EAAZAsNidygkYBAGCiBUUsC1sfntZA62BBrsCF3iDZAgUBdyNe9GkkdgYOi5maemaHQzSEMJHQQTrKuaZCe0GUKUfKZBPxivg7qnoJQ2035lZCglnZBK4iiEgmhitYPD3HvoFc9241QybPbw2T8i2ohmWbpcNM2G7turkcvtAjPjsgZDZD';

// Default vars
var currentSenderID;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === 'horoscope_challenge_token') {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sent({ "error": "Permission denied", "message" : "Sorry this is restricted area!"});
  }
});


// Received our post
router.post('/webhook', function(req, res) {
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
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know you've
        // successfully received the callback. Otherwise, the request will time out.
        res.sendStatus(200);
    }
});

// Receiving the message
function receivedMessage(event) {

    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeofMessage = event.timestamp;
    var message = event.message;
    currentSenderID = event.sender.id;

    console.log(JSON.stringify(message));

    // Filter what we really want
    var messageText = event.message.text;
    var messageAttachment = event.message.attachment;

    if (messageText == "Get Started") {
        showListOfSigns();
        return;
    }
    if (messageText) {
        messageText = messageText.toLowerCase();
        switch (messageText) {

            case "leo":
            case "leo":
            case "leoo":
                _getHoroscope("leo");
                break;

            case "ari":
            case "arie":
            case "aries":
            case "ariess":
                _getHoroscope("aries");
                break;

            case "taurus":
            case "tau":
            case "taur":
                _getHoroscope("taurus");
                break;

            case "gemini":
            case "gem":
            case "gemi":
            case "gemini":
                _getHoroscope("gemini");
                break;

            case "can":
            case "canc":
            case "cancer":
                _getHoroscope("cancer");
                break;

            case "pisces":
            case "pis":
            case "pisc":
                _getHoroscope("pisces");
                break;

            case "aquarius":
            case "aqu":
            case "aqua":
                _getHoroscope("aquarius");
                break;

            case "libra":
            case "lib":
            case "libr":
                _getHoroscope("libra");
                break;

            case "virgo":
            case "vir":
            case "virg":
                _getHoroscope("virgo");
                break;

            case "scorpio":
            case "sco":
            case "scor":
                _getHoroscope("scorpio");
                break;

            case "sagittarius":
            case "sag":
            case "sagi":
                _getHoroscope("sagittarius");
                break;

            case "capricorn":
            case "cap":
            case "capr":
                _getHoroscope("capricorn");
                break;

            case "list":
                showListOfSigns();
                break;

            case "send":
                _defaultMessageSender(senderID, "Helo there");
                break;

            case "goodbye":
            case "bye":
                _defaultMessageSender(senderID, "Goodbye for now. Hope to see you tomorrow.");
                break;

            default:
                _defaultMessageSender(senderID, "Sorry unable to recognized the words please type again or select signs.");
        }
    } else if (messageAttachment) {
        _defaultMessageSender(senderID, "Message with attachment received");
    }
}

// Send out our daily horoscope
function _sendHoroscope( horoscopeMessage ) {

    // Make sure that our file does not exceeds 320 char
    // This is prior to facebook text limitation
    // If we don't handle it properly facebook returns an error
    var messageText = chunkString( horoscopeMessage, 250);

    // If our horoscope text exceeds 250 char then it will be divided into chunks
    // If chunk files are divided into more file
    // If i is less than the array.length then continue looping
    for( var i = 0; i < messageText.length; i ++ ) {
        console.log( "Message body: ", messageText[i] );
        _defaultMessageSender(currentSenderID, messageText[i] );
    }
}

// Send structure message with buttons
function receivedPushback( event ) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeofMessage = event.timestamp;

    var payload = event.postback.payload;

    console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeofMessage);

    if(payload.indexOf('aries') > -1 || payload === 'aries'){
        _defaultMessageSender( senderID, "You have chosen " + payload.substr(0).toUpperCase() + " as your sign.");
    }else {
        _defaultMessageSender( senderID, "Error proccesing request"  + payload);
    }

}

// Show Horoscope for today
function _getHoroscope( sign ) {

    // First send intro message
    _defaultMessageSender(currentSenderID, "Here is today's horoscope for " + sentenceCase( sign ), false);
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
            _sendHoroscope( currentHoroscope );

        } else {
            console.log("This is callback response: ", error);
        }
    });
}

// Show list of signs
function showListOfSigns() {
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
                        "title": "Is your sign Aries?",
                        "subtitle": "Just type the first three characters of the sing eg: ari for aries",
                        "image_url": "http://hscpcdn.jaredco.com/zodiac-dates.png",
                        "buttons": [{
                            "type": "postback",
                            "title": "Yes",
                            "payload": "aries"
                        }, {
                            "type": "postback",
                            "title": "No",
                            "payload": "notaries"
                        }],

                    }, {
                        "title": "Please tell me your signs?",
                        "subtitle": "Just type the first three characters of the sing eg: ari for aries",
                        "image_url": "http://hscpcdn.jaredco.com/zodiac-dates.png"
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

// Send call API
function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: PAGE_ACCESS_TOKEN
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

// Limit the string
function chunkString(str, len) {
    var _size = Math.ceil(str.length / len),
        _ret = new Array(_size);

    var _offset = 0;
    for (var _i = 0; _i < _size; _i++) {
        if (_offset + len > str.length) {
            _ret[_i] = str.substring(_offset, str.length).toString();
        } else if (str.substring(_offset + len, _offset + len + 1) === " ") {
            _ret[_i] = str.substring(_offset, _offset + len);
            _offset = (_i + 1) * len;
            var data = _ret[_i] + "...";
            _ret = data;
        } else {
            // need to back up a bit
            for (var j = 1; j < 20; j++) {
                if (str.substring(_offset + len - j, _offset + len - j + 1) == " ") {
                    _ret[_i] = str.substring(_offset, _offset + len - j);
                    _offset = _offset + len - j;
                    console.log("ret : " + _ret[_i] + "   " + _offset);
                    break;
                }
            }
        }
    }
    return _ret;
}


module.exports = router;
