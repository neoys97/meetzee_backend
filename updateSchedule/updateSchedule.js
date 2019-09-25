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
  
  // let userId = "john_dalton";
  // let password = "12345678";
  // let routines = [
  // {
  //   date: ["2019-09-23", "2019-10-23"],
  //   day: 5,
  //   repeat: 3,
  //   timeslot: ["08:00", "09:00"],
  //   title: "COMP5330",
  //   remarks: "some random stupid course"
  // },
  // {
  //   date: ["2019-09-23", "2019-10-23"],
  //   day: 4,
  //   repeat: 2,
  //   timeslot: ["10:00", "12:00"],
  //   title: "ENGG1120",
  //   remarks: "electrical boring course"
  // },
  // {
  //   date: ["2019-09-23", "2019-10-23"],
  //   day: 4,
  //   repeat: 1,
  //   timeslot: ["13:00", "14:00"],
  //   title: "ENGG1190",
  //   remarks: "electronic stupid course"
  // },
  // {
  //   date: ["2019-09-23", "2019-10-23"],
  //   day: 3,
  //   repeat: 2,
  //   timeslot: ["08:00", "15:00"],
  //   title: "COMP3330",
  //   remarks: "some random stupid course"
  // },
  // {
  //   date: ["2019-09-23", "2019-10-23"],
  //   day: 3,
  //   repeat: 1,
  //   timeslot: ["16:00", "17:00"],
  //   title: "COMP3241",
  //   remarks: "some new random stupid course"
  // },
  // ];

  let userId = event.userId;
  let routines = event.routines;

  let response = {
    statusCode: 200
  };

  if (!routines) {
    response.body = JSON.stringify({
      status: 0,
      message: "routines cannot be empty"
    });
    return response;
  }

  const userRef = db.collection('users').doc(userId);
  
  let schedule = meetzee_util.routinesToSchedule(routines);
  
  let updateData = {
    "schedule": schedule,
    "routines": routines,
    "timestamp": moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
  };

  return userRef.update(updateData, {merge: true}).then(ref => {
    response.body = JSON.stringify({
      status: 1,
      message: "routines and schedule updated successfully!"
    });
    return response;
  }, err => {
    response.body = JSON.stringify({
      status: 2,
      message: "routines and schedule fail to update"
    });
    return response;
  });
}
