/**
 * delete event for particular users
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * userIds              : list of users' ID (provide all the participants if you want to remove the event completely)
 * eventId              : eventId of the event
 * 
 * Example of JSON      : {
 *    userIds     : ["yoshi_pika", "mario_torch"],
 *    duration    : "F21O17dndT5ly2i141PA",
 * }
 * 
 * Returned JSON format:
 * status   : -1 => failed operation (server is busy)
 *             0 => failed operation
 *             1 => successful operation
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

  let userIds = event.userIds;
  let eventId = event.eventId;  

  // let userIds = ["luigi_toto", "mario_torch", "yoshi_pika"];
  // let eventId = "ZYQHzOqgEPBLiH6mqAyh";

  if (userIds.length == 0 || !eventId) {
    response.body = JSON.stringify({
      status: 0,
      message: "userIds and eventId cannot be empty"
    });
    return response;
  }

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

  const userRef = db.collection('users');
  const eventRef = db.collection('events');

  let eventSnapshot = await eventRef.doc(eventId).get();
  let event_data = eventSnapshot.data();

  let users = {};
  let userPromises = [];
  for (var i = 0; i < userIds.length; i++) {
    const p = userRef.doc(userIds[i]).get();
    userPromises.push(p);
  }

  let userSnapshot = await Promise.all(userPromises);
  for (var i = 0; i < userSnapshot.length; i++) {
    users[userSnapshot[i].id] = (userSnapshot[i].data());
  }

  for (var k in users) {
    var index = users[k].events[event_data.date].indexOf(eventId);
    if (index > -1) {
      users[k].events[event_data.date].splice(index, 1);
    }
    var index = event_data.participants.indexOf(k);
    if (index > -1) {
      event_data.participants.splice(index, 1);
    }
  }
  
  let batch = db.batch();
  for (var k in users) {
    let event_key = "events." + event_data.date;
    let update_data = {
      [event_key]: users[k].events[event_data.date],
      timestamp: moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
    };
    batch.update(userRef.doc(k), update_data);
  }

  if (event_data.participants.length != 0) {
    batch.update(eventRef.doc(eventId), {
      participants: event_data.participants,
      timestamp: moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
    });
  } 
  else {
    batch.delete(eventRef.doc(eventId));
  }

  await batch.commit();
  await lockRef.update({locked: 0});

  response.body = JSON.stringify({
    status: 1,
    message: "event deleted successfully"
  });
  return response;
}