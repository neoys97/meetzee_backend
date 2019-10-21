/**
 * clear the notification of the users (call after you call get user to clear previous notification)
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * userId: user's id of the users you want the notification to be cleared
 * 
 * Returned JSON format:
 * status   : 1 (always 1 XD)
 * message  : "Notification cleared"
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
    statusCode: 200,
    body: JSON.stringify({
      status: 1,
      message: "Notification cleared"
    })
  };

  let userId = events.userId;
  // let userId = "vulpix_squirt";

  await db.collection('users').doc(userId).update({
    "notifications.rescheduleRequest": [],
    "notifications.newEvent": [],
    "notifications.rescheduleSuccess": [],
    "notifications.rescheduleEvent": [],
    "timestamp": moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
  });
  
  return response;
}