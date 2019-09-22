/**
 * Create user on the firestore
 * - add firestore credential in current directory and rename it as serviceAccount.json
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
  // let userId = "john_dalton";
  // let password = "12345678";
  let userId = event.userId;
  let password = event.password;

  const userRef = db.collection('users').doc(userId);
  return await userRef.get().then(async (idSnapshot) => {
    if (idSnapshot.exists) {
      if (password == idSnapshot.data().password) {
        return (
          {
            statusCode: 200,
            body: JSON.stringify(
              {
                status: 1,
                message: "login successfully"
              }
            )
          }
        ); 
      } else {
        return (
          {
            statusCode: 200,
            body: JSON.stringify(
              {
                status: 0,
                message: "wrong password"
              }
            )
          }
        ); 
      }
    } else {
      return (
        {
          statusCode: 200,
          body: JSON.stringify(
            {
              status: 2,
              message: "user does not exist"
            }
          )
        }
      ); 
    }
  });
}
