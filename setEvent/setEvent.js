/**
 * set event for different users
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * userIds              : list of users' ID
 * new_event            : JSON object of new event to be added
 * 
 * Example of JSON      : {
 *    userIds     : ["yoshi_pika", "mario_torch", "luigi_toto"],
 *    new_event   : {
 *      date    : "2019-10-01",
 *      timeslot: ["20:00:00", "21:00:00"],
 *      location: "",
 *      title   : "Pre Competition meeting",
 *      remarks : ""
 *    }
 * }
 * 
 * Returned JSON format:
 * status             : -1  => server is busy
 *                      0  => failed operation 
 *                      1  => successful operation
 * suggested_location : one suggested location
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');
const moment = require('moment');
const meetzee_util = require('./meetzee_utility.js');
const HKU_main_campus = require('./HKU_main_campus.json');

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

  // let userIds = ["yoshi_pika", "mario_torch", "luigi_toto"];
  // let new_event = {
  //   date: "2019-10-01",
  //   timeslot: ["08:00:00", "08:30:00"],
  //   location: "",
  //   title: "Morning stupid event",
  //   remarks: ""
  // };

  let userIds = event.userIds;
  let new_event = event.new_event;

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
  // let user_arg = []
  let userPromises = [];
  for (var i = 0; i < userIds.length; i++) {
    const p = userRef.doc(userIds[i]).get();
    userPromises.push(p);
  }

  let userPromise = await Promise.all(userPromises);
  for (var i = 0; i < userPromise.length; i++){
    users[userPromise[i].id] = userPromise[i].data();
    // user_arg.push(userSnapshot[i].data());
  }

  let users_processed = {};
  let eventsIds = [];
  for (var k in users) {
    let tmp = meetzee_util.extractEventsID([users[k]], [new_event.date]);
    users[k].relEventIds = tmp; 
    eventsIds.push(...tmp);
  }
  eventsIds = Array.from(new Set(eventsIds));

  let all_events = {};
  let eventPromises = [];
  for (var i = 0; i < eventsIds.length; i++) {
    const p = eventRef.doc(eventsIds[i]).get();
    eventPromises.push(p);
  }

  let eventPromise = await Promise.all(eventPromises);
  for (var i = 0; i < eventPromise.length; i++) {
    all_events[eventPromise[i].id] = eventPromise[i].data();
  }
  
  for (var k in users) {
    users_processed[k] = meetzee_util.extractTimeList([users[k]], [new_event.date]);
  }

  for (var k in all_events) {
    let event_time_slot = meetzee_util.convertToTimeslotObject(all_events[k].date + " " + all_events[k].timeslot[0], all_events[k].date + " " + all_events[k].timeslot[1], all_events[k].location);
    for (var i in users) {
      if (users[i].relEventIds.includes(k)) {
        users_processed[i].push(event_time_slot);
      }
    }
  }
  
  let timeList = [];
  for (var k in users_processed) {
    users_processed[k] = meetzee_util.mergeSingleTimeslot(users_processed[k]);
    timeList.push(...users_processed[k]);
  }

  let eventSlot = meetzee_util.convertToTimeslotObject(new_event.date + " " + new_event.timeslot[0], new_event.date + " " + new_event.timeslot[1], new_event.location);
  
  let mergedTimeList = meetzee_util.mergeSingleTimeslot(timeList);
  let inversedTimeList = meetzee_util.inverseTimeList(mergedTimeList);

  let clash = meetzee_util.checkTimeSlotClash(inversedTimeList, eventSlot);
  if (clash) {
    response.body = JSON.stringify({
      status: 0,
      message: "The time slot has already been taken"
    });
    await lockRef.update({locked: 0});
    return response;
  }

  let recent_loc = [];
  for (var k in users_processed) {
    let curr_loc = meetzee_util.getMostRecentLocation(users_processed[k], eventSlot);
    if (curr_loc) recent_loc.push(curr_loc);
  }
  
  recent_loc = Array.from(new Set(recent_loc));
  let suggested_location = "";
  if (recent_loc.length == 1) {
    suggested_location = recent_loc[0];
  } 
  else {
    suggested_location = meetzee_util.getSuggestedLocation(HKU_main_campus, recent_loc);
  }

  new_event.timestamp = moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss");
  new_event.participants = userIds;
  let eventSnapshot = await eventRef.add(new_event);
  let batch = db.batch();
  for (var i = 0; i < userIds.length; i++) {
    let modify_event = users[userIds[i]].events[new_event.date];
    if (modify_event) {
      modify_event.push(eventSnapshot.id);
      modify_event = Array.from(new Set(modify_event));
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
    message: "Event successfully written",
    suggested_location: suggested_location
  });

  await batch.commit();
  await lockRef.update({locked: 0});

  return response;
}