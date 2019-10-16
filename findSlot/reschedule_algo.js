const moment = require("moment");
const meetzee_util = require('./meetzee_utility.js');

let GLOBAL_DATE = "2019-10-1";
let GLOBAL_SCHEDULE = [
    {
        start   : "00:00:00",
        end     : "08:30:00",
    }, 
    {
        start   : "09:30:00",
        end     : "13:30:00",
    },
    {
        start   : "14:00:00",
        end     : "15:00:00",
    },
    {
        start   : "19:00:00",
        end     : "22:00:00",
    },
    {
        start   : "24:00:00",
        end     : "24:00:00",
    }
];
let GLOBAL_EVENTS = {
    "unique_id1" : {
        start   : "08:30:00",
        end     : "09:00:00"
    },
    "unique_id2" : {
        start   : "13:30:00",
        end     : "14:00:00"
    },
    "unique_id3" : {
        start   : "15:30:00",
        end     : "16:30:00"
    },
    "unique_id4" : {
        start   : "17:30:00",
        end     : "18:30:00"
    },
    "unique_id5" : {
        start   : "22:30:00",
        end     : "23:30:00"
    }
};
let GLOBAL_TARGET_EVENT_DURATION = "02:00:00";
let GLOBAL_DISCRETE_DELTA = meetzee_util.getTimeDelta("00:30:00");
let GLOBAL_RESCHEDULE_EVENTS_NUMBER = 2;

for (var i = 0; i < GLOBAL_SCHEDULE.length; i ++) {
    GLOBAL_SCHEDULE[i].start = moment(GLOBAL_DATE + " " + GLOBAL_SCHEDULE[i].start, "YYYY-MM-DD HH:mm:ss");
    GLOBAL_SCHEDULE[i].end = moment(GLOBAL_DATE + " " + GLOBAL_SCHEDULE[i].end, "YYYY-MM-DD HH:mm:ss");
}

for (var k in GLOBAL_EVENTS) {
    GLOBAL_EVENTS[k].start = moment(GLOBAL_DATE + " " + GLOBAL_EVENTS[k].start, "YYYY-MM-DD HH:mm:ss");
    GLOBAL_EVENTS[k].end = moment(GLOBAL_DATE + " " + GLOBAL_EVENTS[k].end, "YYYY-MM-DD HH:mm:ss");
}

GLOBAL_TARGET_EVENT_DURATION = meetzee_util.getTimeDelta(GLOBAL_TARGET_EVENT_DURATION);

let powerset = (array) => { 
	const results = [[]];
	for (const value of array) {
		const copy = [...results]; 
		for (const prefix of copy) {
			results.push(prefix.concat(value));
		}
	}
	return results;
};

let atomiseAvailableTime = (availableTime, single_duration, target_duration) => {
    let atomisedSlot = [];
    for (var slot of availableTime) {
        if ((slot.end - slot.start) < target_duration) continue;
        let curr_start = slot.start;
        while (moment(curr_start + target_duration) <= slot.end) {
            let tmp = {};
            tmp.start = curr_start;
            tmp.end = moment(curr_start + target_duration);
            atomisedSlot.push(tmp);
            curr_start = moment(curr_start + single_duration);
        }
    }
    return atomisedSlot;
};

let checkPossibleRescheduleClash = (possible_reschedule) => {
    let timeSlot = [];
    let possible = true;
    for (var k in possible_reschedule) {
        timeSlot.push(possible_reschedule[k]);
    }
    timeSlot.sort(meetzee_util.compareTimeSlots);
    for (var i = 0; i < timeSlot.length - 1; i++) {
        if (timeSlot[i].end > timeSlot[i+1].start) {
            possible = false;
            break;
        }
    }
    return possible;
};

let checkRescheduleFeasibility = (schedule, events, victim_ids, target_duration) => {
    let currSchedule = schedule;
    for (var k in events) {
        if (victim_ids.includes(k)) continue;
        currSchedule.push(meetzee_util.convertToTimeslotObject(events[k].date + " " + events[k].timeslot[0], events[k].date + " " + events[k].timeslot[1], events[k].location));
    }
    let tmpCurrSchedule = deepCopyScheduleArray(currSchedule);
    let availableTime = meetzee_util.inverseTimeList(meetzee_util.mergeSingleTimeslot(tmpCurrSchedule));
    let atomisedAvailableSlot = atomiseAvailableTime(availableTime, GLOBAL_DISCRETE_DELTA, target_duration);
    for (var slot of atomisedAvailableSlot) {
        let checkSchedule = deepCopyScheduleArray(currSchedule);
        checkSchedule.push(slot);
        checkSchedule = meetzee_util.inverseTimeList(meetzee_util.mergeSingleTimeslot(checkSchedule));
        var possibleRescheduleTimeSlot = {};
        for (var victim_id of victim_ids) {
            let tmpDuration = events[victim_id].timeSlot.end - events[victim_id].timeSlot.start;
            possibleRescheduleTimeSlot[victim_id] = atomiseAvailableTime(checkSchedule, GLOBAL_DISCRETE_DELTA, tmpDuration);       
        }
        /** Only works for 2 events reschedule, MAKE CHANGES if going to scale up */
        let possibleEventKeys = Object.keys(possibleRescheduleTimeSlot);
        let possibleResult = [];
        if (possibleEventKeys.length == 1) {
            if (possibleRescheduleTimeSlot[possibleEventKeys[0]].length != 0) {
                // console.log("found");
                let returnValue = {};
                returnValue["new_event"] = slot;
                returnValue[possibleEventKeys[0]] = possibleRescheduleTimeSlot[possibleEventKeys[0]][0];
                return returnValue;
            }
            else {
                // console.log("None");
                return (null);
            }
        }
        else {
            /** Only return 1 result, make modification to scale up */
            for (var posSlot0 of possibleRescheduleTimeSlot[possibleEventKeys[0]]) {
                for (var posSlot1 of possibleRescheduleTimeSlot[possibleEventKeys[1]]) {
                    let tmpPosRes = {};
                    tmpPosRes[possibleEventKeys[0]] = posSlot0;
                    tmpPosRes[possibleEventKeys[1]] = posSlot1;
                    possibleResult.push(tmpPosRes);
                }
            }
            for (var posSlot of possibleResult) {
                if (checkPossibleRescheduleClash(posSlot)) {
                    // console.log("found too");
                    let returnValue = posSlot;
                    returnValue["new_event"] = slot;
                    return (returnValue);
                }
            }    
        } 
    }
    // console.log("None");
    return (null);
};

let deepCopyScheduleArray = (schedule) => {
    let newSchedule = JSON.parse(JSON.stringify(schedule));
    for (var i = 0; i < schedule.length; i++) {
        newSchedule[i].start = moment(newSchedule[i].start, "YYYY-MM-DDTHH:mm:ssZ");
        newSchedule[i].end = moment(newSchedule[i].end, "YYYY-MM-DDTHH:mm:ssZ");
    }
    return newSchedule;
};

let rescheduleBruteForce = (schedule, events, target_duration) => {
    let eventsIds = [];
    for (var k in events) {
        eventsIds.push(k);
    }
    let eventsSet = powerset(eventsIds).filter(x => {return (x.length <= GLOBAL_RESCHEDULE_EVENTS_NUMBER && x.length > 0)});
    let rescheduleResult = null;
    for (var victim of eventsSet) {
        let tmp_schedule = deepCopyScheduleArray(schedule);
        rescheduleResult = checkRescheduleFeasibility (tmp_schedule, events, victim, target_duration);
        if (rescheduleResult != null) break;
    } 
    return rescheduleResult;
};

// rescheduleBruteForce(GLOBAL_SCHEDULE, GLOBAL_EVENTS, GLOBAL_TARGET_EVENT_DURATION);
module.exports = {
    rescheduleBruteForce
}