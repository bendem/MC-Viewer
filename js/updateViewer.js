// Update period in minutes (should be stored in config!)
var timer = 10;

// Don't try to update e.g. cause of the alarm if it's already updating cause the popup has been opened
// Could be a timestamp so you don't update every time you open the popup but maybe every 20 seconds
var isUpdating = false;

// Create an alarm which will trigger the update every ``timer`` minutes
chrome.alarms.create("updateTrigerer", {
    periodInMinutes: timer,
});
chrome.alarms.onAlarm.addListener(function(alarm) {
    if(alarm.name == "updateTrigerer") {
        update();
    }
});

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
    // console.log(JSON.parse(this.response));
    var response = JSON.parse(this.response)
        , diff = response.diff                 // Diff should not be handled server-side !
        , players = response.players;

    var notifTemplate = {
        type: "basic",
        iconUrl: "http://mc-viewer.bendem.be/skin.php?t=head&s=64&u=",
        title: " has ",
        message: " has just "
    }, msgEnd = " from mc.bendem.be", notifDetails;

    // Send connection notification
    for (var i = diff.connections.length - 1; i >= 0; i--) {
        notifDetails = notifTemplate;
        notifDetails.iconUrl += diff.connections[i];
        notifDetails.title = diff.connections[i] + notifDetails.title + "connected";
        notifDetails.message = diff.connections[i] + notifDetails.message + "connected" + msgEnd;

        chrome.notifications.create(
            diff.connections[i] + "_connected",
            notifDetails,
            function() {}
        );
    }
    // Send disconnection notification
    for (var i = diff.disconnections.length - 1; i >= 0; i--) {
        notifDetails = notifTemplate;
        notifDetails.iconUrl += diff.disconnections[i];
        notifDetails.title = diff.disconnections[i] + notifDetails.title + "disconnected";
        notifDetails.message = diff.disconnections[i] + notifDetails.message + "disconnected" + msgEnd;

        chrome.notifications.create(
            diff.disconnections[i] + "_disconnected",
            notifDetails,
            function() {}
        );
    }

    // Update avatars in the popup
    var view = document.querySelector('#main');
    if(players.length == 0) {
        view.innerHTML = "Pas de joueurs connectés...";
    } else {
        view.innerHTML = "";
    }
    for (var i = players.length - 1; i >= 0; i--) {
        view.innerHTML += '<img src="' + notifTemplate.iconUrl + players[i] + '" alt="' + players[i] + '"/>';
    }

    // Update badge number
    chrome.browserAction.setBadgeText({
        text: players.length.toString()
    });

    isUpdating = false;
    console.log("update end");
}

// Launch the update directly
update();

// And every time the popup is open
window.onload = update;
