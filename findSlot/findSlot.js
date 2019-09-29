/**
 * update user's schedule on the firestore, MUST pass ALL ROUTINES to this function
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * userId               : user's ID
 * routines             : list of user's routines
 * example of routines  : [{
 *    date: ["2019-09-23", "2019-10-23"],
 *    day: 5,
 *    repeat: 3,
 *    timeslot: ["08:00", "09:00"],
 *    title: "COMP5330",
 *    remarks: "some random new course"
 *    location: "KKL312"
 * }, {...}]
 * Indicators: 
 * days => 0 = Sunday         repeat => 0 = None
 *         1 = Monday                   1 = Daily
 *         2 = Tuesday                  2 = Weekly
 *         3 = Wednesday                3 = Monthly
 *         4 = Thursday
 *         5 = Friday
 *         6 = Saturday
 * 
 * Returned JSON format:
 * status   : 0 => failed operation, routines is empty 
 *            1 => successful operation
 *            2 => failed operation
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
  
  let userIds = ["yoshi_pika", "mario_torch", "luigi_toto"];
  let duration = "05:00:00";
  let bufferTime = "00:10:00";
  let dates = ["2019-10-01", "2019-10-06"];
  // let userId = event.userId;
  // let routines = event.routines;

  let response = {
    statusCode: 200
  };

  const userRef = db.collection('users');
  
  let users = [];
  let userPromises = [];
  for (var i = 0; i < userIds.length; i++) {
    const p = userRef.doc(userIds[i]).get();
    userPromises.push(p);
  }

  await Promise.all(userPromises)
  .then(userSnapshot => {
      userSnapshot.forEach(user => {
          users.push(user.data());
      });
  })
  .catch(err => {
      console.log("Error getting document", err);
      response.body = JSON.stringify({
        status: 0,
        message: "error in getting users' document"
      });
      return response
  });

  let listOfDates = meetzee_util.generateListOfDates(dates);
  let timeList = meetzee_util.extractTimeList(users, listOfDates);
  
  let mergedTimeList = meetzee_util.mergeSingleTimeslot(timeList);
  let inversedTimeList = meetzee_util.inverseTimeList(mergedTimeList);

  let durationDelta = meetzee_util.getTimeDelta(duration);
  let bufferTimeDelta = meetzee_util.getTimeDelta(bufferTime);

  let freeTimeList = meetzee_util.getFreeTimeList(inversedTimeList, durationDelta);
  
  if (freeTimeList) {
    response.body = JSON.stringify({
      status: 1,
      availableTime: freeTimeList,
      message: "successful operation"
    });
  }
  else {
    response.body = JSON.stringify({
      status: 2,
      message: "No available time slot"
    });
  }
  return response;
}
