/**
 * find user's available time slot
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * userIds              : list of users' ID
 * duration             : how long the event is
 * dates                : list of 2 dates, starting and ending date
 * 
 * Example of JSON      : {
 *    userIds     : ["yoshi_pika", "mario_torch", "luigi_toto"],
 *    duration    : "01:00:00",
 *    dates       : ["2019-10-01", "2019-10-01"]
 * }
 * 
 * Indicators: 
 * duration : "HH:mm:ss"
 * dates    : [start, end]
 * 
 * Returned JSON format:
 * status   : 0 => failed operation 
 *            1 => successful operation
 *            2 => failed operation, no available timeslot
 * if operation is successful
 * availableTime: list of available time slot
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');
const moment = require('moment');
const meetzee_util = require('./meetzee_utility.js');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
db.settings({timestampsInSnapshots: true});

exports.lambdaHandler = async (event, context, callback) => {
  
  // let userIds = ["yoshi_pika", "mario_torch", "luigi_toto"];
  // let duration = "05:00:00";
  // let bufferTime = "00:10:00";
  // let dates = ["2019-10-01", "2019-10-01"];

  let userIds = event.userIds;
  let duration = event.duration;
  let bufferTime = event.bufferTime;
  let dates = event.dates;

  let response = {
    statusCode: 200
  };

  const userRef = db.collection('users');
  const eventRef = db.collection('events');

  let users = [];
  let userPromises = [];
  for (var i = 0; i < userIds.length; i++) {
    const p = userRef.doc(userIds[i]).get();
    userPromises.push(p);
  }

  await Promise.all(userPromises)
  .then(userSnapshot => {
      userSnapshot.forEach(user => {
          users.push(user.data());
      });
  })
  .catch(err => {
      console.log("Error getting document", err);
      response.body = JSON.stringify({
        status: 0,
        message: "error in getting users' document"
      });
      return response
  });

  let listOfDates = meetzee_util.generateListOfDates(dates);

  let eventsIds = meetzee_util.extractEventsID(users, listOfDates);
  let all_events = [];
  let eventPromises = [];
  for (var i = 0; i < eventsIds.length; i++) {
    const p = eventRef.doc(eventsIds[i]).get();
    eventPromises.push(p);
  }

  await Promise.all(eventPromises)
  .then(eventSnapshot => {
      eventSnapshot.forEach(event => {
        all_events.push(event.data());
      });
  })
  .catch(async err => {
      console.log("Error getting document", err);
      response.body = JSON.stringify({
        status: 0,
        message: "error in getting events document"
      });
      await lockRef.update({locked: 0});
      return response;
  });

  let timeList = meetzee_util.extractTimeList(users, listOfDates);
  
  for (var i = 0; i < all_events.length; i++) {
    let tmp = meetzee_util.convertToTimeslotObject(all_events[i].date + " " + all_events[i].timeslot[0], all_events[i].date + " " + all_events[i].timeslot[1], all_events[i].location);
    timeList.push(tmp);
  }
  
  let mergedTimeList = meetzee_util.mergeSingleTimeslot(timeList);
  
  let inversedTimeList = meetzee_util.inverseTimeList(mergedTimeList);
  
  let durationDelta = meetzee_util.getTimeDelta(duration);
  // buffer time
  // let bufferTimeDelta = meetzee_util.getTimeDelta(bufferTime);

  let freeTimeList = meetzee_util.getFreeTimeList(inversedTimeList, durationDelta);

  if (freeTimeList.length != 0) {
    response.body = JSON.stringify({
      status: 1,
      availableTime: freeTimeList,
      message: "successful operation"
    });
  }
  else {
    response.body = JSON.stringify({
      status: 2,
      message: "No available time slot"
    });
  }
  return response;
}