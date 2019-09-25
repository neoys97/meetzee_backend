/**
 * utility function for meetzee
 */

const moment = require('moment');

/**
 * Miscellaneous function
 * _______________________________________________________________________________________
 */

/**
 * compare function for timeslots
 * @param {timeslot JSON object} a 
 * @param {timeslot JSON object} b 
 */
let compareTimeSlots = (a, b) => {
    if ( a.start < b.start ){
        return -1;
    }
    if ( a.start > b.start ){
        return 1;
    }
    return 0;
}

let formatSingleTimeslot = (listOfTimeslot) => {
    for (n in listOfTimeslot) {
        listOfTimeslot[n].start = listOfTimeslot[n].start.format("HH:mm:ss");
        listOfTimeslot[n].end = listOfTimeslot[n].end.format("HH:mm:ss");
    }
    return listOfTimeslot;
};

/**
 * Timeslot manipulation function
 * _______________________________________________________________________________________
 */

/**
 * merge all the timeslots object
 * @param {list of timeslot JSON object} listOfTimeslot 
 */
let mergeSingleTimeslot = (listOfTimeslot) => {
    let mergedTimeslot = [];
    listOfTimeslot.sort(compareTimeSlots);

    mergedTimeslot.push(listOfTimeslot[0]);
    listOfTimeslot.shift();

    while (listOfTimeslot.length > 0) {
        let currSlot = listOfTimeslot[0];
        listOfTimeslot.shift();
        if (mergedTimeslot[mergedTimeslot.length - 1].end >= currSlot.start) {
            if (mergedTimeslot[mergedTimeslot.length - 1].end < currSlot.end) {
                mergedTimeslot[mergedTimeslot.length - 1].end = currSlot.end.clone();
            }
        }
        else {
            mergedTimeslot.push(currSlot);
        }
    }

    return mergedTimeslot;
};


/**
 * Routine manipulation function
 * _______________________________________________________________________________________
 */

/**
 * convert list of routine to schedule
 * @param {list of routine JSON objects} listOfRoutine 
 */
let routinesToSchedule = (listOfRoutine) => {
    schedule =  {};
    for (routine of listOfRoutine) {
        let startDate = moment(routine.date[0], "YYYY-MM-DD").utc().day(routine.day);
        let endDate = moment(routine.date[1], "YYYY-MM-DD").utc().day(routine.day);
        let curr = startDate;

        let repeat_days = 0;
        switch (routine.repeat) {
            case 1:
                repeat_days = 1;
                break;
            case 2:
                repeat_days = 7;
                break;
            case 3:
                repeat_days = 30;
                break;
            default:
                repeat_days = 0;
                break;
        }

        while (curr < endDate) {
            let key = curr.format("YYYY-MM-DD");
            if (schedule[key]) {
                schedule[key].push({
                    start: moment((key + " " +routine.timeslot[0]), "YYYY-MM-DD HH:mm:ss"),
                    end: moment((key + " " +routine.timeslot[1]), "YYYY-MM-DD HH:mm:ss"),
                })
            } else {
                schedule[key] = [{
                    start: moment((key + " " +routine.timeslot[0]), "YYYY-MM-DD HH:mm:ss"),
                    end: moment((key + " " +routine.timeslot[1]), "YYYY-MM-DD HH:mm:ss"),
                }]
            }
            curr = curr.add(repeat_days,"days");
        }
    }

    for (key in schedule) {
        schedule[key] = mergeSingleTimeslot(schedule[key]);
        schedule[key] = formatSingleTimeslot(schedule[key]);
    }

    return schedule;
};

module.exports = {
    routinesToSchedule,
    mergeSingleTimeslot
};