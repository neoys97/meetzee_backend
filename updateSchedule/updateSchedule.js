/**
 * update user's schedule on the firestore
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * userId   : user's ID
 * password : user's password
 * 
 * Returned JSON format:
 * status   : 0 => failed login, wrong password 
 *            1 => successful login
 *            2 => failed login, user not found
 * 
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
  let userId = "john_dalton";
  let password = "12345678";
  let routines = [{
    date: ["2019-09-23", "2019-10-23"],
    day: 3,
    repeat: 2,
    timeslot: ["08:00", "15:00"],
    title: "COMP3330",
    remarks: "some random stupid course"
  }, {
    date: ["2019-09-23", "2019-10-23"],
    day: 3,
    repeat: 2,
    timeslot: ["00:00", "09:00"],
    title: "COMP3241",
    remarks: "some new random stupid course"
  }];
  // let userId = event.userId;
  // let password = event.password;

  const userRef = db.collection('users').doc(userId);

  // let getData = await userRef.get().then(snapshot => {
  //   response.body = JSON.stringify(snapshot.data()["routine"])
  // });

  // let getData = await userRef.get();
  // response.body = JSON.stringify(getData.data()["routines"].concat(routines))
  // await userRef.update({routines: getData.data()["routines"].concat(routines)});
  response.body = JSON.stringify(meetzee_util.routinesToSchedule(routines));
  return (response);
  // return userRef.update({"routine": routines}, {merge: true}).then(ref => {
  //   console.log("successful");
  // }, err => {
  //   console.log("fail");
  // });
}
