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
 * availableTime  : list of available time slot
 * rescheduleId   : 0 => no reschedule
 *                  transactionId => reschedule 
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');
const moment = require('moment');
const meetzee_util = require('./meetzee_utility.js');
const reschedule_algo = require('./reschedule_algo.js');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
db.settings({timestampsInSnapshots: true});

exports.lambdaHandler = async (event, context, callback) => {
  
  // let userIds = ["mario_torch", "vulpix_squirt"];
  // let duration = "02:00:00";
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

  let users = {};
  let userPromises = [];
  for (var i = 0; i < userIds.length; i++) {
    const p = userRef.doc(userIds[i]).get();
    userPromises.push(p);
  }

  let userSnapshot = await Promise.all(userPromises);
  for (var userSnap of userSnapshot) {
    users[userSnap.id] = userSnap.data();
  }

  let listOfDates = meetzee_util.generateListOfDates(dates);

  let eventsIds = [];
  for (var userId in users) {
    var tmp = meetzee_util.extractEventsID([users[userId]], listOfDates);
    eventsIds.push(...tmp);
    users[userId].relatedEventsIds = tmp;
  }
  eventsIds = Array.from(new Set(eventsIds));

  let all_events = {};
  let eventPromises = [];
  for (var i = 0; i < eventsIds.length; i++) {
    const p = eventRef.doc(eventsIds[i]).get();
    eventPromises.push(p);
  }

  let eventSnapshot = await Promise.all(eventPromises);
  for (var eventSnap of eventSnapshot) {
    all_events[eventSnap.id] = eventSnap.data();
  }

  let timeList = [];
  for (var userId in users) {
    timeList.push(...(meetzee_util.extractTimeList([users[userId]], listOfDates)));
  }
  
  for (var k in all_events) {
    let tmp1 = meetzee_util.convertToTimeslotObject(all_events[k].date + " " + all_events[k].timeslot[0], all_events[k].date + " " + all_events[k].timeslot[1], all_events[k].location);
    let tmp2 = meetzee_util.convertToTimeslotObject(all_events[k].date + " " + all_events[k].timeslot[0], all_events[k].date + " " + all_events[k].timeslot[1], all_events[k].location);
    all_events[k].timeSlot = tmp1;
    timeList.push(tmp2);
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
      reschedule: 0,
      message: "successful operation"
    });
    return response;
  }

  console.log("No possible slots found, trying to check for possible reschedule resolution");

  let firstLvlUserIds = [];
  for (var k in all_events) {
    firstLvlUserIds.push(...all_events[k].participants);
  }
  firstLvlUserIds = Array.from(new Set(firstLvlUserIds));

  for (var uid of userIds) {
    let index = firstLvlUserIds.indexOf(uid);
    if (index == -1) continue;
    firstLvlUserIds.splice(index, 1);
  }

  userPromises = [];
  for (var i = 0; i < firstLvlUserIds.length; i++) {
    const p = userRef.doc(firstLvlUserIds[i]).get();
    userPromises.push(p);
  }

  userSnapshot = await Promise.all(userPromises);
  for (var userSnap of userSnapshot) {
    users[userSnap.id] = userSnap.data();
  }
  
  let firstLvlEventsIds = [];
  for (var uid of firstLvlUserIds) {
    var tmp = meetzee_util.extractEventsID([users[uid]], listOfDates);
    firstLvlEventsIds.push(...tmp);
    users[uid].relatedEventsIds = tmp;
  }

  firstLvlEventsIds = Array.from(new Set(firstLvlEventsIds))

  for (var eid of eventsIds) {
    let index = firstLvlEventsIds.indexOf(eid);
    if (index == -1) continue;
    firstLvlEventsIds.splice(index, 1);
  }

  eventPromises = [];
  for (var i = 0; i < firstLvlEventsIds.length; i++) {
    const p = eventRef.doc(firstLvlEventsIds[i]).get();
    eventPromises.push(p);
  }

  eventSnapshot = await Promise.all(eventPromises);

  for (var eventSnap of eventSnapshot) {
    all_events[eventSnap.id] = eventSnap.data();
    all_events[eventSnap.id].timeSlot = meetzee_util.convertToTimeslotObject(all_events[eventSnap.id].date + " " + all_events[eventSnap.id].timeslot[0], all_events[eventSnap.id].date + " " + all_events[eventSnap.id].timeslot[1], all_events[eventSnap.id].location);
  }

  let groupsInfo = {};
  for (var k in all_events) {
    let needToAdd = false;
    for (var uid of userIds) {
      if (all_events[k].participants.indexOf(uid) != -1) {
        needToAdd = true;
        break;
      }
    }
    if (needToAdd) {
      let groupId = meetzee_util.extractGroupIDFromEvent(all_events[k]);
      if (groupsInfo[groupId] == undefined) {
        groupsInfo[groupId] = [k];
      }
      else {
        groupsInfo[groupId].push(k);
      }
    }
  }

  let rescheduleResult;
  let resolved;

  for (var groupId in groupsInfo) {
    resolved = false;
    for (var date of listOfDates) {
      let dayTimeList = [];
      let dayEventId = [];
      for (var userId of userIds) {
        dayTimeList.push(...(meetzee_util.extractTimeList([users[userId]], [date])));
        for (var eid of users[userId].relatedEventsIds) {
          if (all_events[eid].date == date) {
            dayEventId.push(eid);
          }
        }
      }
      for (var uid of all_events[groupsInfo[groupId][0]].participants) {
        dayTimeList.push(...(meetzee_util.extractTimeList([users[uid]], [date])));
        for (var eid of users[uid].relatedEventsIds) {
          if (all_events[eid].date == date) {
            dayEventId.push(eid);
          }
        }
      }
      dayEventId = Array.from(new Set(dayEventId));
      let dayVictimEvents = {};
      for (var eid of groupsInfo[groupId]) {
        if (all_events[eid].date == date) {
          dayVictimEvents[eid] = all_events[eid];
          let index = dayEventId.indexOf(eid);
          if (index == -1) continue;
          dayEventId.splice(index, 1);
        }
      }
      for (var eid of dayEventId) {
        dayTimeList.push(meetzee_util.convertToTimeslotObject(all_events[eid].date + " " + all_events[eid].timeslot[0], all_events[eid].date + " " + all_events[eid].timeslot[1], all_events[eid].location));
      }
      
      let mergedDayTimeList = meetzee_util.mergeSingleTimeslot(dayTimeList);
      rescheduleResult = reschedule_algo.rescheduleBruteForce(mergedDayTimeList, dayVictimEvents, durationDelta);
      if (rescheduleResult != null) {
        resolved = true;
        break;
      }
    }
    if (resolved) break;
  }

  if (resolved) {
    for (var k in rescheduleResult) {
      rescheduleResult[k].start = rescheduleResult[k].start.format("YYYY-MM-DD HH:mm:ss");
      rescheduleResult[k].end = rescheduleResult[k].end.format("YYYY-MM-DD HH:mm:ss");
    }
    rescheduleResult.timestamp = moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss");
    let transactionSnapshot = await db.collection("transactions").add(rescheduleResult);
    response.body = JSON.stringify({
      status: 1,
      availableTime: [rescheduleResult.new_event],
      reschedule: transactionSnapshot.id,
      message: "successful operation with reschedule"
    });
  } 
  else {
    response.body = JSON.stringify({
      status: 2,
      availableTime: [],
      reschedule: 0,
      message: "failed operation, no available slot"
    });
  }

  return response;
}