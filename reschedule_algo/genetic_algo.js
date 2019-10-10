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
        end     : "17:30:00"
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
let GLOBAL_TARGET_EVENT_DURATION = "01:00:00";

for (var i = 0; i < GLOBAL_SCHEDULE.length; i ++) {
    GLOBAL_SCHDULE[i].start = moment(GLOBAL_DATE + " " + GLOBAL_SCHDULE[i].start, "YYYY:MM:DD HH:mm:ss");
    GLOBAL_SCHDULE[i].end = moment(GLOBAL_DATE + " " + GLOBAL_SCHDULE[i].end, "YYYY:MM:DD HH:mm:ss");
}

for (var k in GLOBAL_EVENTS) {
    GLOBAL_SCHDULE[k].start = moment(GLOBAL_DATE + " " + GLOBAL_SCHDULE[k].start, "YYYY:MM:DD HH:mm:ss");
    GLOBAL_SCHDULE[k].end = moment(GLOBAL_DATE + " " + GLOBAL_SCHDULE[k].end, "YYYY:MM:DD HH:mm:ss");
}

GLOBAL_TARGET_EVENT_DURATION = meetzee_util.getTimeDelta(GLOBAL_TARGET_EVENT_DURATION);