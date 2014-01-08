// Update period in minutes (should be stored in config!)
var timer = 10;

// Don't try to update e.g. cause of the alarm if it's already updating cause the popup has been opened
// Could be a timestamp so you don't update every time you open the popup but maybe every 20 seconds
var isUpdating = false;

// Contain the url to use to get the skin (just concat the pseudo to it...)
var skinUrl = "http://mc-viewer.bendem.be/skin.php?t=head&s=64&u=";

// Create an alarm which will trigger the update every ``timer`` minutes
chrome.alarms.create("updateTrigerer", {
    periodInMinutes: timer,
});
chrome.alarms.onAlarm.addListener(function(alarm) {
    if(alarm.name == "updateTrigerer") {
        update();
    }
});

var players = {
    list: [],
    firstRun: true,
    diff: {
        connections:    [],
        disconnections: []
    }
};

Array.prototype.contains = function(p_val) {
    var l = this.length;
    for(var i = 0; i < l; i++) {
        if(this[i] == p_val) {
            return true;
        }
    }
    return false;
}


function update() {
    if(isUpdating) {
        return;
    }
    isUpdating = true;
    console.log("update start");

    // Update the viewer and send notifications if join or quit
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = xhrReadyHandler; // Implemented elsewhere.
    xhr.open("GET", "http://mc-viewer.bendem.be/ajax.php", true);
    xhr.send();
}

function xhrReadyHandler() {
    if(this.readyState != XMLHttpRequest.DONE) {
        return;
    }
    var response = JSON.parse(this.response);

    var notifTemplate = {
        type: "basic",
        iconUrl: skinUrl,
        title: " has ",
        message: " has just "
    }, msgEnd = " from mc.bendem.be", notifDetails;

    // Do not notify the users at first run so the user doesn't get 5 notifications
    // if 5 players were connected at the time he opens his navigator.
    if(!players.firstRun) {
        // Creating diffs
        players.diff.connections    = [];
        players.diff.disconnections = [];
        // Connections
        for (var i = response.players.length - 1; i >= 0; i--) {
            if(!players.list.contains(response.players[i])) {
                players.diff.connections.push(response.players[i]);
            }
        }
        // Disconnections
        for (i = players.list.length - 1; i >= 0; i--) {
            if(!response.players.contains(players.list[i])) {
                players.diff.disconnections.push(players.list[i]);
            }
        }
    } else {
        players.firstRun = false;
    }
    players.list = response.players;

    // Send connection notifications
    for (var i = players.diff.connections.length - 1; i >= 0; i--) {
        notifDetails = notifTemplate;
        notifDetails.iconUrl += players.diff.connections[i];
        notifDetails.title = players.diff.connections[i] + notifDetails.title + "connected";
        notifDetails.message = players.diff.connections[i] + notifDetails.message + "connected" + msgEnd;

        chrome.notifications.create(
            players.diff.connections[i] + "_connected",
            notifDetails,
            function() {}
        );
    }
    // Send disconnection notifications
    for (i = players.diff.disconnections.length - 1; i >= 0; i--) {
        notifDetails = notifTemplate;
        notifDetails.iconUrl += players.diff.disconnections[i];
        notifDetails.title = players.diff.disconnections[i] + notifDetails.title + "disconnected";
        notifDetails.message = players.diff.disconnections[i] + notifDetails.message + "disconnected" + msgEnd;

        chrome.notifications.create(
            players.diff.disconnections[i] + "_disconnected",
            notifDetails,
            function() {}
        );
    }

    // Update avatars in the popup
    var view = document.querySelector('#main');
    if(players.list.length == 0) {
        view.innerHTML = "Pas de joueurs connectés...";
    } else {
        view.innerHTML = "";
    }
    for (var i = players.list.length - 1; i >= 0; i--) {
        view.innerHTML += '<img src="' + skinUrl + players.list[i] + '" alt="' + players.list[i] + '"/>';
    }

    // Update badge number
    chrome.browserAction.setBadgeText({
        text: players.list.length.toString()
    });

    isUpdating = false;
    console.log("update end");
}

// Launch the update directly
update();

// And every time the popup is open
window.onload = update;
