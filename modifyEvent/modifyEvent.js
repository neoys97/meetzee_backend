/**
 * modify event info (except those related to time slot)
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * eventId                : event's ID
 * eventData              : {
 *    location: "new location",
 *    remarks: "new remarks",
 *    title: "new title"
 * }
 * Do not pass in the key value if there is no modification needed
 * eg. if you want to change only the location, pass only the location
 * 
 * Returned JSON format:
 * status   : 0  => failed operation 
 *            1  => successful operation
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

  // let eventId = "F21O17dndT5ly2i141PA";
  // let eventData = {
  //   location: "KK",
  // };

  let eventId = event.eventId;
  let eventData = event.eventData;

  if (!eventId) {
    response.body = JSON.stringify({
      status: 0,
      message: "event id cannot be empty"
    });
    return response;
  }

  if (!eventData) {
    response.body = JSON.stringify({
      status: 0,
      message: "event data cannot be empty"
    });
    return response;
  }

  const eventRef = db.collection('events');

  eventData.timestamp = moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss");
  await eventRef.doc(eventId).update(eventData);

  response.body = JSON.stringify({
    status: 1,
    message: "event modification successful",
  });

  return response;
}