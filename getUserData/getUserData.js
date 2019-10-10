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

  // let userId = "yoshi_pika";

  let userId = event.userId;

  if (!userId) {
    response.body = JSON.stringify({
      status: 0,
      message: "user ID cannot be empty"
    });
    return response;
  }

  const userRef = db.collection('users');

  let userSnapshot = await userRef.doc(userId).get();

  response.body = JSON.stringify({
    status: 1,
    message: "operation successful",
    userData: userSnapshot.data()
  });

  return response;
}