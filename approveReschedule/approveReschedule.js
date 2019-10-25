/**
 * approve reschedule from host of victim events
 * - add firestore credential in current directory and rename it as serviceAccount.json
 * 
 * Required JSON key:
 * transactionId  : transaction id of the reschedule solution
 * eventId        : event id of the victim events associated to the host
 * approved       : 0 => disapprove
 *                  1 => approve
 * 
 * Example of JSON      : {
 *    transactionId = "XOz8VKvc6LIpWw9ivybh",
 *    eventId = "7IZFvZZvHifbjFAxZwq8",
 *    approved = 1
 * }
 * 
 * Returned JSON format:
 * message: "Entry is recorded"
 * 
 * Results from the function:
 * If all the hosts of victim events have responded, the transaction will be deleted from the database
 * If the there is one host who disapproves the reschedule request, nothing changes, but the user requesting for reschedule will get an
 * update on its notification.rescheduleSuccess session
 * If all the hosts approved the request, the victim events time will be changed, the affected users will get a notification under
 * notification.rescheduleEvent
 * Then a new event will be created and a notification will be added to all the participants under notification.newEvent
 * The user who request for reschedule will get a notification under notification.rescheduleSucces upon successful reschedule
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

  let locked = false;
  let lockRef = db.collection('lock').doc('all');

  let lockSnapshot = await lockRef.get();
  if (lockSnapshot.data().locked == 1) {
    locked = true;
    response.body = JSON.stringify({
      status: -1,
      message: "Server is busy"
    });
  } else {
    lockRef.update({locked: 1});
  }

  if (locked) {
    return response;
  }

  // let transactionId = "KYIxNXV8w9gi9s0m2lDB";
  // let eventId = "BPzGdMl5069yNuToWrsx";
  // let approved = 1;

  let transactionId = event.transactionId;
  let eventId = event.eventId;
  let approved = event.approved;

  if (!eventId) {
    response.body = JSON.stringify({
      status: 0,
      message: "eventId cannot be empty"
    });
    await lockRef.update({locked: 0});
    return response;
  }

  if (!transactionId) {
    response.body = JSON.stringify({
      status: 0,
      message: "transactionId cannot be empty"
    });
    await lockRef.update({locked: 0});
    return response;
  }

  const userRef = db.collection('users');
  const eventRef = db.collection('events');
  const transactionRef = db.collection('transactions');

  let transactionSnapshot = await transactionRef.doc(transactionId).get();
  let transactionData = transactionSnapshot.data();
  
  transactionData.victim_events[eventId].approved = approved;
  transactionData.victim_events[eventId].responded = 1;
  let doReschedule = true;
  let completeRespond = true;
  let batch = db.batch();
  for (var k in transactionData.victim_events) {
    if (transactionData.victim_events[k].approved == 0) {
      doReschedule = false;
    }
    if (transactionData.victim_events[k].responded == 0) {
      completeRespond = false;
    }
  }

  if (completeRespond) {
    console.log("complete respond");

    let check_events = {};
    let eventPromises = [];
    let date = "";

    for (var k in transactionData.victim_events) {
      const p = eventRef.doc(k).get();
      eventPromises.push(p);
    }
    let eventPromise = await Promise.all(eventPromises);

    let userIds = Array.from(transactionData.new_event.participants);
    let victim_uid = [];
    for (var i = 0; i < eventPromise.length; i++) {
      check_events[eventPromise[i].id] = eventPromise[i].data();
      userIds.push(...eventPromise[i].data().participants);
      victim_uid.push(...eventPromise[i].data().participants);
      date = eventPromise[i].data().date;
    }
    userIds = Array.from(new Set(userIds));
    victim_uid = Array.from(new Set(victim_uid));
    let users = {};
    let userPromises = [];
    for (var i = 0; i < userIds.length; i++) {
      const p = userRef.doc(userIds[i]).get();
      userPromises.push(p);
    }
    let userPromise = await Promise.all(userPromises);
    for (var i = 0; i < userPromise.length; i++){
      users[userPromise[i].id] = userPromise[i].data();
    }

    let eventsIds = [];
    for (var k in users) {
      let tmp = meetzee_util.extractEventsID([users[k]], [date]);
      users[k].relEventIds = tmp; 
      eventsIds.push(...tmp);
    }
    eventsIds = Array.from(new Set(eventsIds));

    for (var k in check_events) {
      for (var uid in users) {
        users[uid].relEventIds = users[uid].relEventIds.filter(x => x != k);
      }
      eventsIds = eventsIds.filter(x => x != k);
    }

    let all_events = {};
    eventPromises = [];
    for (var i = 0; i < eventsIds.length; i++) {
      const p = eventRef.doc(eventsIds[i]).get();
      eventPromises.push(p);
    }

    let laterUserIds = [];
    eventPromise = [];
    eventPromise = await Promise.all(eventPromises);
    for (var i = 0; i < eventPromise.length; i++) {
      all_events[eventPromise[i].id] = eventPromise[i].data();
      laterUserIds.push(...eventPromise[i].data().participants)
    }
    laterUserIds = Array.from(new Set(laterUserIds));
    laterUserIds = laterUserIds.filter(x => !(userIds.includes(x)));

    userPromises = [];
    for (var i = 0; i < laterUserIds.length; i++) {
      const p = userRef.doc(laterUserIds[i]).get();
      userPromises.push(p);
    }
    userPromise = [];
    userPromise = await Promise.all(userPromises);
    for (var i = 0; i < userPromise.length; i++){
      users[userPromise[i].id] = userPromise[i].data();
    }

    let users_processed = {};
    for (var k in users) {
      users_processed[k] = meetzee_util.extractTimeList([users[k]], [date]);
    }
    for (var k in all_events) {
      let event_time_slot = meetzee_util.convertToTimeslotObject(all_events[k].date + " " + all_events[k].timeslot[0], all_events[k].date + " " + all_events[k].timeslot[1], all_events[k].location);
      for (var i in users) {
        if (users[i].relEventIds != undefined) {
          if (users[i].relEventIds.includes(k)) {
            users_processed[i].push(event_time_slot);
          }
        }
      }
    }
    if (doReschedule) {
      console.log("do reschedule");
      let clash = false;
      let tmpTimelist = [];
      for (var uid of transactionData.new_event.participants) {
        tmpTimelist.push(...users_processed[uid]);
      }
      tmpTimelist = meetzee_util.inverseTimeList(meetzee_util.mergeSingleTimeslot(tmpTimelist));
      tmpEventSlot = meetzee_util.convertToTimeslotObject(transactionData.new_event.start, transactionData.new_event.end, "");
      clash = meetzee_util.checkTimeSlotClash(tmpTimelist, tmpEventSlot);
      if (!clash) {
        for (var k in check_events) {
          tmpTimelist = [];
          for (var uid of check_events[k]["participants"]) {
            tmpTimelist.push(...users_processed[uid]);
          }
          tmpTimelist = meetzee_util.inverseTimeList(meetzee_util.mergeSingleTimeslot(tmpTimelist));
          tmpEventSlot = meetzee_util.convertToTimeslotObject(transactionData.victim_events[k].start, transactionData.victim_events[k].end, "");
          clash = meetzee_util.checkTimeSlotClash(tmpTimelist, tmpEventSlot);
          if (clash) break;
        }
      }

      if (!clash) {
        let new_event_data = {
          host: transactionData.new_event.host,
          date: transactionData.new_event.start.split(" ")[0],
          timeslot: [transactionData.new_event.start.split(" ")[1], transactionData.new_event.end.split(" ")[1]],
          participants: transactionData.new_event.participants,
          location: (transactionData.new_event.location != undefined) ? transactionData.new_event.location : "",
          remarks: (transactionData.new_event.remarks != undefined) ? transactionData.new_event.remarks : "",
          title: (transactionData.new_event.title != undefined) ? transactionData.new_event.title : "",
          timestamp: moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
        }
        // create meeting
        let new_eventSnapshot = await eventRef.add(new_event_data);

        // change victims events timeslot and notify victims event participants
        for (var k in transactionData.victim_events) {
          console.log(check_events[k]);
          check_events[k]["timeslot"] = [transactionData.victim_events[k].start.split(" ")[1], transactionData.victim_events[k].end.split(" ")[1]];
          check_events[k]["timestamp"] = moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss");
          batch.update(eventRef.doc(k), check_events[k]);

          for (var uid of check_events[k].participants) {
            let rescheduleEventNotiMsg = {
              eventId: k,
              reschedule_start: transactionData.victim_events[k].start,
              reschedule_end: transactionData.victim_events[k].end
            };

            let rescheduleEventNoti = users[uid].notifications.rescheduleEvent;
            if (rescheduleEventNoti != undefined) {
              rescheduleEventNoti.push(rescheduleEventNotiMsg);
              rescheduleEventNoti = Array.from(new Set(rescheduleEventNoti));
            }
            else {
              rescheduleEventNoti = [rescheduleEventNotiMsg];
            }
            batch.update(userRef.doc(uid), {
              "notifications.rescheduleEvent": rescheduleEventNoti,
              timestamp: moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
            });
          }
        }
        // add meeting id to created users and notify participants
        for (var k of transactionData.new_event.participants) {
          let newEventIds = users[k].events[date];
          if (newEventIds != undefined) {
            newEventIds.push(new_eventSnapshot.id);
            newEventIds = Array.from(new Set(newEventIds));
          }
          else {
            newEventIds = [new_eventSnapshot.id];
          }

          let newEventNotiMsg = {
            eventId: new_eventSnapshot.id,
            start: transactionData.new_event.start,
            end: transactionData.new_event.end
          };
          let newEventNoti = users[k].notifications.newEvent;
          if (newEventNoti != undefined) {
            newEventNoti.push(newEventNotiMsg);
            newEventNoti = Array.from(new Set(newEventNoti));
          }
          else {
            newEventNoti = [newEventNotiMsg];
          }

          batch.update(userRef.doc(k), {
            ["events."+ date]: newEventIds,
            "notifications.newEvent": newEventNoti,
            timestamp: moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
          });
        }
        let rescheduleSuccessMsgNoti = {
          eventId: new_eventSnapshot.id,
          start: transactionData.new_event.start,
          end: transactionData.new_event.end,
        };
        let rescheduleSuccessMsg = users[transactionData.new_event.host].notifications.rescheduleSuccess;
        if (rescheduleSuccessMsg != undefined) {
          rescheduleSuccessMsg.push(rescheduleSuccessMsgNoti);
          rescheduleSuccessMsg = Array.from(new Set(rescheduleSuccessMsg));
        }
        else {
          rescheduleSuccessMsg = [rescheduleSuccessMsgNoti];
        }
        batch.update(userRef.doc(transactionData.new_event.host), {
          "notifications.rescheduleSuccess": rescheduleSuccessMsg,
          timestamp: moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
        });
      }
      else {
        console.log("time clash cannot reschedule");
        let rescheduleSuccessMsg = users[transactionData.new_event.host].notifications.rescheduleSuccess;
        let rescheduleSuccessMsgNoti = {
          eventId: "fail",
          start: transactionData.new_event.start,
          end: transactionData.new_event.end,
        };
        if (rescheduleSuccessMsg != undefined) {
          rescheduleSuccessMsg.push(rescheduleSuccessMsgNoti);
          rescheduleSuccessMsg = Array.from(new Set(rescheduleSuccessMsg));
        }
        else {
          rescheduleSuccessMsg = [rescheduleSuccessMsgNoti];
        }
        batch.update(userRef.doc(transactionData.new_event.host), {
          "notifications.rescheduleSuccess": rescheduleSuccessMsg,
          timestamp: moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
        });
      }
    }
    else {
      console.log("someone disapproved cannot reschedule");
      let rescheduleSuccessMsg = users[transactionData.new_event.host].notifications.rescheduleSuccess;
      let rescheduleSuccessMsgNoti = {
        eventId: "fail",
        start: transactionData.new_event.start,
        end: transactionData.new_event.end,
      };
      if (rescheduleSuccessMsg != undefined) {
        rescheduleSuccessMsg.push(rescheduleSuccessMsgNoti);
        rescheduleSuccessMsg = Array.from(new Set(rescheduleSuccessMsg));
      }
      else {
        rescheduleSuccessMsg = [rescheduleSuccessMsgNoti];
      }
      batch.update(userRef.doc(transactionData.new_event.host), {
        "notifications.rescheduleSuccess": rescheduleSuccessMsg,
        timestamp: moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
      });
    }
    // delete transactions from victims
    for (var uid of victim_uid) {
      let reschedule_transactions = users[uid].reschedule_req;
      reschedule_transactions = reschedule_transactions.filter(x => x != transactionId);
      batch.update(userRef.doc(uid), {
        reschedule_req: reschedule_transactions,
        timestamp: moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
      });
    }
    // delete transactions
    batch.delete(transactionRef.doc(transactionId));
  }
  else {
    console.log("not complete respond");
    batch.update(transactionRef.doc(transactionId), {
      ["victim_events." + eventId]: transactionData.victim_events[eventId],
      timestamp: moment().utc().add(8,"hours").format("YYYY-MM-DD HH:mm:ss")
    });
  }

  await batch.commit()
  await lockRef.update({locked: 0});

  response.body = JSON.stringify({
    message: "Entry is recorded",
  });
  return response;
}