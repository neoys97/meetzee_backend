/**
 * accepet reschedule solution by the user who request to reschedule
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * userIds        : list of users' id which are the participants of this new event 
 * new_event      : similar to that of set event function, refer to the example below
 * transactionId  : transaction id of the reschedule solution
 * 
 * Example of JSON: {
 *    userIds : ["vulpix_squirt", "mario_torch"],
 *    new_event : {
 *        date: "2019-10-01",
 *        timeslot: ["16:30:00", "18:30:00"],
 *        location: "",
 *        host: "vulpix_squirt",
 *        title: "rescheduled to make this shit happen",  
 *        remarks: "tedious shit" 
 *    }  
 *    transactionId : "XOz8VKvc6LIpWw9ivybh";
 * }
 * 
 * Returned JSON format:
 * status   : 0  => failed operation 
 *            1  => successful operation
 * message  : "Reschedule solution accepted"
 * 
 * Results from the function:
 * Host of victim events will have a notification under notification.rescheduleRequest and reschedule_req will store the transaction ids
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

  // let userIds = ["vulpix_squirt", "mario_torch"];
  // let new_event = {
  //   date: "2019-10-01",
  //   timeslot: ["16:30:00", "18:30:00"],
  //   location: "",
  //   host: "vulpix_squirt",
  //   title: "rescheduled to make this shit happen",
  //   remarks: "tedious shit"
  // };
  // let transactionId = "XOz8VKvc6LIpWw9ivybh";

  let userIds = event.userIds;
  let new_event = event.new_event;
  let transactionId = event.transactionId;

  if (!userIds) {
    response.body = JSON.stringify({
      status: 0,
      message: "user ids cannot be empty"
    });
    return response;
  }

  if (!new_event) {
    response.body = JSON.stringify({
      status: 0,
      message: "new event cannot be empty"
    });
    return response;
  }

  if (!transactionId) {
    response.body = JSON.stringify({
      status: 0,
      message: "transaction id cannot be empty"
    });
    return response;
  }
  let batch = db.batch();

  const userRef = db.collection('users');
  const eventRef = db.collection('events');
  const transactionRef = db.collection('transactions');

  let transactionSnapshot = await transactionRef.doc(transactionId).get();
  let transactionData = transactionSnapshot.data();
  
  transactionData.new_event.title = new_event.title;
  transactionData.new_event.location = new_event.location;
  transactionData.new_event.host = new_event.host;
  transactionData.new_event.remarks = new_event.remarks;
  batch.update(transactionRef.doc(transactionId), {
    new_event: transactionData.new_event
  });

  let victim_events = {};
  let eventPromises = [];
  for (var k in transactionData.victim_events) {
    const p = eventRef.doc(k).get();
    eventPromises.push(p);
  }

  let victim_userIds = [];
  let eventSnapshot = await Promise.all(eventPromises);
  for (var eventSnap of eventSnapshot) {
    victim_events[eventSnap.id] = eventSnap.data();
    victim_userIds.push(eventSnap.data().host);
  }
  victim_userIds = Array.from(new Set(victim_userIds));

  let victim_users = {};
  let userPromises = [];
  for (var i = 0; i < victim_userIds.length; i++) {
    const p = userRef.doc(victim_userIds[i]).get();
    userPromises.push(p);
  }

  let userSnapshot = await Promise.all(userPromises);
  for (var userSnap of userSnapshot) {
    victim_users[userSnap.id] = userSnap.data();
  }

  for (var k in transactionData["victim_events"]) {
    let transactionReqId = victim_users[victim_events[k].host]["reschedule_req"];
    let notificationsRescheduleRequest = victim_users[victim_events[k].host]["notifications"]["rescheduleRequest"];
    if (transactionReqId != undefined) {
      transactionReqId.push(transactionSnapshot.id);
      transactionReqId = Array.from(new Set(transactionReqId));
    }
    else {
      transactionReqId = [transactionSnapshot.id];
    }
    let rescheduleNotiMessage = {
      eventId: k,
      reschedule_start: transactionData["victim_events"][k].start,
      reschedule_end: transactionData["victim_events"][k].end
    };
    if (notificationsRescheduleRequest != undefined) {
      notificationsRescheduleRequest.push(rescheduleNotiMessage);
      notificationsRescheduleRequest = Array.from(new Set(notificationsRescheduleRequest));
    } 
    else {
      notificationsRescheduleRequest = [rescheduleNotiMessage];
    }
    
    batch.update(userRef.doc(victim_events[k].host), {
      "reschedule_req" : transactionReqId,
      "notifications.rescheduleRequest": notificationsRescheduleRequest,
      "timestamp": moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
    });
  }
  await batch.commit();

  response.body = JSON.stringify({
    status: 1,
    message: "Reschedule solution accepted"
  });
  return response;
}