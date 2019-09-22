/**
 * Update user's friends on the firestore
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * operation: 0 => remove friends
 *            1 => add friends
 * userId   : user's ID
 * friends  : list of friends
 * 
 * Returned JSON format:
 * status   : 0 => failed operation
 *            1 => successful operation
 */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');
const moment = require('moment');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
db.settings({timestampsInSnapshots: true});
exports.lambdaHandler = async (event, context, callback) => {
  // let operation = 0;
  // let userId = "john_dalton";
  // let friends = ["good to know", "neo_ys"];

  let operation = event.operation;
  let userId = event.userId;
  let friends = event.friends;
  let updateDetail;
  if (operation == 1) {
    updateDetail = {
      "friends": admin.firestore.FieldValue.arrayUnion(...friends),
      "timestamp": moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
    };
  } else {
    updateDetail = {
      "friends": admin.firestore.FieldValue.arrayRemove(...friends),
      "timestamp": moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
    };
  }
  const userRef = db.collection('users').doc(userId);
  let updateFriends = userRef.update(updateDetail);
  
  return updateFriends.then(ref => {
    return ({
      statusCode: 200,
      body: JSON.stringify(
        {
          status: 1,
          message: "friends updated successfully"
        }
      )
    });
  }, err => {
    return ({
      statusCode: 200,
      body: JSON.stringify(
        {
          status: 0,
          message: "fail to update friends"
        }
      )
    });
  });
}
