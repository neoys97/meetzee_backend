/**
 * reset the lock on the firestore
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * None
 * 
 * Returned JSON format:
 * message  : "lock reset successfully"
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
      message: "lock reset successfully"
    })
  };

  await db.collection('lock').doc('all').update({locked: 1});

  return response;
}