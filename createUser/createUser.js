/**
 * Create user on the firestore
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * userId   : user's ID
 * password : user's password
 * 
 * Returned JSON format:
 * status   : 0 => failed operation, user ID already exists 
 *            1 => successful operation
 *            2 => failed operation
 * 
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
      return (
        {
          statusCode: 200,
          body: JSON.stringify(
            {
              status: 0,
              message: "user ID already exists"
            }
          )
        }
      ); 
    } else {
      return await userRef.set(
        {
          "password": password,
          "timestamp": moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
        }
      ).then(value => {
        return (
          {
            statusCode: 200,
            body: JSON.stringify(
              {
                status: 1,
                message: "user created successfully"
              }
            )
          }
        );
      }, 
      reason => {
        return (
          {
            statusCode: 200,
            body: JSON.stringify(
              {
                status: 2,
                message: "user creation failed"
              }
            )
          }
        );
      });
    }
  });
}
