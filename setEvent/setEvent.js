/**
 * update user's schedule on the firestore, MUST pass ALL ROUTINES to this function
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * userId               : user's ID
 * routines             : list of user's routines
 * example of routines  : [{
 *    date: ["2019-09-23", "2019-10-23"],
 *    day: 5,
 *    repeat: 3,
 *    timeslot: ["08:00", "09:00"],
 *    title: "COMP5330",
 *    remarks: "some random new course"
 *    location: "KKL312"
 * }, {...}]
 * Indicators: 
 * days => 0 = Sunday         repeat => 0 = None
 *         1 = Monday                   1 = Daily
 *         2 = Tuesday                  2 = Weekly
 *         3 = Wednesday                3 = Monthly
 *         4 = Thursday
 *         5 = Friday
 *         6 = Saturday
 * 
 * Returned JSON format:
 * status   : 0 => failed operation, routines is empty 
 *            1 => successful operation
 *            2 => failed operation
 * 
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
  let response = {
    statusCode: 200
  };
  let locked = false;
  let lockRef = db.collection('lock').doc('all');

  let lockSnapshot = await lockRef.get();
  if (lockSnapshot.data().locked == 1) {
    locked = true;
    response.body = JSON.stringify({
      status: -1,
      message: "Server is busy"
    });
  } else {
    lockRef.update({locked: 1});
  }

  if (locked) {
    return response;
  }

  let userIds = ["yoshi_pika", "mario_torch", "luigi_toto"];
  let new_event = {
    date: "2019-10-01",
    timeslot: ["20:00:00", "21:00:00"],
    location: "",
    title: "Pre Competition meeting",
    remarks: ""
  };

  // let userId = event.userId;
  // let routines = event.routines;

  if (!new_event) {
    response.body = JSON.stringify({
      status: 0,
      message: "new event cannot be empty"
    });
    await lockRef.update({locked: 0});
    return response;
  }

  const userRef = db.collection('users');
  const eventRef = db.collection('events');

  let users = {};
  let user_arg = []
  let userPromises = [];
  for (var i = 0; i < userIds.length; i++) {
    const p = userRef.doc(userIds[i]).get();
    userPromises.push(p);
  }

  await Promise.all(userPromises)
  .then(userSnapshot => {
    for (var i = 0; i < userSnapshot.length; i++){
      users[userSnapshot[i].id] = userSnapshot[i].data();
      user_arg.push(userSnapshot[i].data());
    }
  })
  .catch(async err => {
    console.log("Error getting document", err);
    response.body = JSON.stringify({
      status: 0,
      message: "error in getting users' document"
    });
    await lockRef.update({locked: 0});
    return response
  });

  let eventsIds = meetzee_util.extractEventsID(user_arg, [new_event.date]);
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

  let timeList = meetzee_util.extractTimeList(user_arg, [new_event.date]);
  
  for (var i = 0; i < all_events.length; i++) {
    let tmp = meetzee_util.convertToTimeslotObject(all_events[i].date + " " + all_events[i].timeslot[0], all_events[i].date + " " + all_events[i].timeslot[1], all_events[i].location);
    timeList.push(tmp);
  }

  let eventSlot = meetzee_util.convertToTimeslotObject(new_event.date + " " + new_event.timeslot[0], new_event.date + " " + new_event.timeslot[1], new_event.location);
  
  let mergedTimeList = meetzee_util.mergeSingleTimeslot(timeList);
  
  let inversedTimeList = meetzee_util.inverseTimeList(mergedTimeList);
  console.log(inversedTimeList);
  let clash = meetzee_util.checkTimeSlotClash(inversedTimeList, eventSlot);
  if (clash) {
    response.body = JSON.stringify({
      status: 0,
      message: "The time slot has already been taken"
    });
    await lockRef.update({locked: 0});
    return response;
  }

  new_event.timestamp = moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss");
  let eventSnapshot = await eventRef.add(new_event);
  let batch = db.batch();
  for (var i = 0; i < userIds.length; i++) {
    let modify_event = users[userIds[i]].events[new_event.date];
    if (modify_event) {
      modify_event.push(eventSnapshot.id);
      modify_event = Array.from(new Set(modify_event))
    } else {
      modify_event = [eventSnapshot.id];
    }
    let modify_event_key = "events." + new_event.date;
    batch.update(userRef.doc(userIds[i]), {
      [modify_event_key] : modify_event,
      "timestamp": moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
    });
  }

  response.body = JSON.stringify({
    status: 1,
    message: "Event successfully written"
  });

  await batch.commit();
  await lockRef.update({locked: 0});

  return response;
}
