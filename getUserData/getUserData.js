/**
 * get user data
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * userId               : user's ID
 * 
 * Returned JSON format:
 * status   : 0  => failed operation 
 *            1  => successful operation
 * userData : JSON object of user data from firestore
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

  // let userId = "Adam";

  let userId = event.userId;

  if (!userId) {
    response.body = JSON.stringify({
      status: 0,
      message: "user ID cannot be empty"
    });
    return response;
  }

  const userRef = db.collection('users');
  const eventRef = db.collection('events');
  const transactionRef = db.collection('transactions');

  let userSnapshot = await userRef.doc(userId).get();
  let eventPromises = [];
  let transactionPromises = [];
  for (var k in userSnapshot.data().events) {
    for (var id of userSnapshot.data().events[k]) {
      const p = eventRef.doc(id).get();
      eventPromises.push(p);
    }
    if (userSnapshot.data().reschedule_req != undefined) {
      for (var tid of userSnapshot.data().reschedule_req) {
        const p = transactionRef.doc(tid).get();
        transactionPromises.push(p);
      }
    }
  }

  let eventSnapshot = await Promise.all(eventPromises);
  let eventData = {};
  for (var ele of eventSnapshot) {
    eventData[ele.id] = ele.data();
  }

  let transactionSnapshot = await Promise.all(transactionPromises);
  let transactionData = {};
  for (var ele of transactionSnapshot) {
    transactionData[ele.id] = ele.data();
  }

  response.body = JSON.stringify({
    status: 1,
    message: "operation successful",
    userData: userSnapshot.data(),
    eventsData: eventData,
    transactionData: transactionData
  });

  return response;
}