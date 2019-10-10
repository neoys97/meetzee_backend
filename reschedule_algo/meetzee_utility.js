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
        if (listOfTimeslot[n].end == "00:00:00") listOfTimeslot[n].end = "24:00:00";
    }
    return listOfTimeslot;
};

let generateListOfDates = (dates) => {
    let listOfDates = [];
    let curr = moment(dates[0], "YYYY-MM-DD");
    let end = moment(dates[1], "YYYY-MM-DD");
    while (curr <= end) {
        listOfDates.push(curr.format("YYYY-MM-DD"));
        curr = curr.add(1,"days");
    }
    return listOfDates;
};

let getTimeDelta = (duration) => {
    let returnValue = 0;
    let time = duration.split(":");
    returnValue += parseInt(time[0]) * 3600000;
    returnValue += parseInt(time[1]) * 60000;
    returnValue += parseInt(time[2]) * 1000;
    return returnValue;
};

let findSmallestDifference = (numbers) => {
    var smallest = 999999;
    for (var i = 0; i < numbers.length - 1; i++) {
        for (var j = i + 1; j < numbers.length; j++) {
            let curr = Math.abs(numbers[i] - numbers[j]);
            if (smallest > curr) {
                smallest = curr;
            }
        }
    }
    return smallest;
};

/**
 * Users manipulation function
 * _______________________________________________________________________________________
 */

let extractTimeList = (users, listOfDates) => {
    let timeList = [];
    for (var i = 0; i < users.length; i++) {
        for (var j = 0; j < listOfDates.length; j++) {
            let temp = users[i].schedule[listOfDates[j]];
            for (var k = 0; k < temp.length; k++) {
                temp[k].start = moment(listOfDates[j] + " " + temp[k].start, "YYYY-MM-DD HH:mm:ss");
                temp[k].end = moment(listOfDates[j] + " " + temp[k].end, "YYYY-MM-DD HH:mm:ss");
            }
            timeList.push(...temp);
        }
    }
    return timeList;
};

let extractEventsID = (users, listOfDates) => {
    let eventsID = [];
    for (var i = 0; i < users.length; i++) {
        for (var j = 0; j < listOfDates.length; j++) {
            let temp = users[i].events[listOfDates[j]];
            if (temp) eventsID.push(...temp);
        }
    }
    eventsID = Array.from(new Set(eventsID))
    return eventsID;
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
                mergedTimeslot[mergedTimeslot.length - 1].end_location = currSlot.end_location;
            }
        }
        else {
            mergedTimeslot.push(currSlot);
        }
    }

    return mergedTimeslot;
};

let inverseTimeList = (listOfTimeList) => {
    inversedTimeList = [];
    let startDay = moment(listOfTimeList[0].start.format("YYYY-MM-DD") + " " + "00:00:00", "YYYY-MM-DD HH-mm-ss");
    let endDay = moment(listOfTimeList[listOfTimeList.length - 1].end.format("YYYY-MM-DD") + " " + "00:00:00", "YYYY-MM-DD HH-mm-ss");
    if (listOfTimeList[0].start != startDay) {
        inversedTimeList.push(
            {
                start: startDay,
                end: listOfTimeList[0].start
            }
        );
    }
    for (var i = 0; i < listOfTimeList.length - 1; i++) {
        inversedTimeList.push({
            start: listOfTimeList[i].end,
            end: listOfTimeList[i+1].start
        });
    }
    if (listOfTimeList[listOfTimeList.length - 1].end != endDay) {
        inversedTimeList.push(
            {
                start: listOfTimeList[listOfTimeList.length - 1].end,
                end: endDay
            }
        );
    }
    return inversedTimeList;
};

let getFreeTimeList = (listOfTimeList, durationDelta) => {
    let freeTimeList = [];
    for (var i = 0; i < listOfTimeList.length; i++) {
        let tempDelta = listOfTimeList[i].end - listOfTimeList[i].start;
        if (tempDelta >= durationDelta) {
            freeTimeList.push(listOfTimeList[i]);
        }
    }
    return freeTimeList;
};

let checkTimeSlotClash = (listOfFreeTimeList, timeslot) => {
    let clash = true;
    for (var i = 0; i < listOfFreeTimeList.length; i++) {
        if (listOfFreeTimeList[i].start <= timeslot.start) {
            if (listOfFreeTimeList[i].end >= timeslot.end) {
                clash = false;
                break;
            }
        }
    }
    return clash;
};

let convertToTimeslotObject = (start, end, location) => {
    let timeSlotObject = {};
    timeSlotObject.start = moment(start,"YYYY-MM-DD HH-mm-ss");
    timeSlotObject.end = moment(end,"YYYY-MM-DD HH-mm-ss");
    timeSlotObject.start_location = location;
    timeSlotObject.end_location = location;
    return timeSlotObject;
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
        let endDate = moment(routine.date[1], "YYYY-MM-DD").utc();
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

        while (curr <= endDate) {
            let key = curr.format("YYYY-MM-DD");
            if (schedule[key]) {
                schedule[key].push({
                    start: moment((key + " " +routine.timeslot[0]), "YYYY-MM-DD HH:mm:ss"),
                    end: moment((key + " " +routine.timeslot[1]), "YYYY-MM-DD HH:mm:ss"),
                    start_location: routine.location,
                    end_location: routine.location
                })
            } else {
                schedule[key] = [{
                    start: moment((key + " " +routine.timeslot[0]), "YYYY-MM-DD HH:mm:ss"),
                    end: moment((key + " " +routine.timeslot[1]), "YYYY-MM-DD HH:mm:ss"),
                    start_location: routine.location,
                    end_location: routine.location
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

/**
 * Location related function
 * _______________________________________________________________________________________
 */

let getMostRecentLocation = (timeList, timeSlot) => {
    let location;
    let index;
    for (var i = 0; i < timeList.length; i++) {        
        if (timeList[i].end > timeSlot.start) {
            index = i - 1;
            break;
        }
    }
    return timeList[index].end_location;
};

let getSuggestedLocation = (location_map, location_list) => {
    let combined_distance = {};
    for (var i = 0; i < location_list.length; i++) {
        let curr = location_map[location_list[i]];
        for (var k in curr) {
            if (combined_distance[k]) {
                combined_distance[k] += curr[k];
            } 
            else {
                combined_distance[k] = curr[k];
            }
        }
    }
    let smallest_locations = [];
    let smallest_distance = 999999;
    for (var k in combined_distance) {
        if (combined_distance[k] < smallest_distance) {
            smallest_distance = combined_distance[k];
        }
    }

    for (var k in combined_distance) {
        if (combined_distance[k] == smallest_distance) {
            smallest_locations.push(k);
        }
    }
    let smallest = 999999;
    let smallest_loc = "";
    for (var i = 0; i < smallest_locations.length; i++) {
        let dist_list = [];
        for (var j = 0; j < location_list.length; j++) {
            dist_list.push(location_map[location_list[j]][smallest_locations[i]]);
        }
        let curr = findSmallestDifference(dist_list);
        if (smallest > curr) {
            smallest = curr;
            smallest_loc = smallest_locations[i];
        }
    }
    return smallest_loc;
};

let getSuggestedLocationv2 = (location_map, location_list) => {  
    let smallest = 999999;
    let smallest_loc = "";
    for (var k in location_map) {
        let dist_list = [];
        for (var j = 0; j < location_list.length; j++) {
            dist_list.push(location_map[location_list[j]][k]);
        }
        let curr = findSmallestDifference(dist_list);
        if (smallest > curr) {
            smallest = curr;
            smallest_loc = k;
        }
    }
    return smallest_loc;
};

module.exports = {
    compareTimeSlots,
    routinesToSchedule,
    mergeSingleTimeslot,
    generateListOfDates,
    extractTimeList,
    inverseTimeList,
    getTimeDelta,
    getFreeTimeList,
    extractEventsID,
    checkTimeSlotClash,
    convertToTimeslotObject,
    getMostRecentLocation,
    getSuggestedLocation
};