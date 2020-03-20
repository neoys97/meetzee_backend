# Documentation
## acceptRescheduleSolution function
### accept reschedule solution by the user who request to reschedule
```bash
Required JSON key:
userIds        : list of users' id which are the participants of this new event 
new_event      : similar to that of set event function, refer to the example below
transactionId  : transaction id of the reschedule solution

Example of JSON: {
   userIds : ["vulpix_squirt", "mario_torch"],
   new_event : {
       date: "2019-10-01",
       timeslot: ["16:30:00", "18:30:00"],
       location: "",
       host: "vulpix_squirt",
       title: "rescheduled to make this things happen",  
       remarks: "tedious stuff" 
   }  
   transactionId : "XOz8VKvc6LIpWw9ivybh";
}

Returned JSON format:
status   : 0  => failed operation 
           1  => successful operation
message  : "Reschedule solution accepted"

Results from the function:
Host of victim events will have a notification under notification.rescheduleRequest and reschedule_req will store the transaction id's
```


## approveReschedule function
### approve reschedule from host of victim events
```bash
Required JSON key:
transactionId  : transaction id of the reschedule solution
eventId        : event id of the victim events associated to the host
approved       : 0 => disapprove
                 1 => approve

Example of JSON      : {
   transactionId = "XOz8VKvc6LIpWw9ivybh",
   eventId = "7IZFvZZvHifbjFAxZwq8",
   approved = 1
}

Returned JSON format:
message: "Entry is recorded"

Results from the function:
If all the hosts of victim events have responded, the transaction will be deleted from the database
If the there is one host who disapproves the reschedule request, nothing changes, but the user requesting for reschedule will get an
update on its notification.rescheduleSuccess session
If all the hosts approved the request, the victim events time will be changed, the affected users will get a notification under
notification.rescheduleEvent
Then a new event will be created and a notification will be added to all the participants under notification.newEvent
The user who request for reschedule will get a notification under notification.rescheduleSucces upon successful reschedule
```


## clearNotification function
### clear the notification of the users (call after you call get user to clear previous notification)
```bash
Required JSON key:
userId: user's id of the users you want the notification to be cleared

Returned JSON format:
status   : 1 (always)
message  : "Notification cleared"
```


## createUser function
### Create user on the firestore
```bash
Required JSON key:
userId   : user's ID
password : user's password

Returned JSON format:
status   : 0 => failed operation, user ID already exists 
           1 => successful operation
           2 => failed operation
```


## deleteEvent function
### delete event for particular users
```bash
Required JSON key:
userIds              : list of users' ID (provide all the participants if you want to remove the event completely)
eventId              : eventId of the event

Example of JSON      : {
   userIds     : ["yoshi_pika", "mario_torch"],
   eventId     : "F21O17dndT5ly2i141PA"
}

Returned JSON format:
status   : -1 => failed operation (server is busy)
            0 => failed operation
            1 => successful operation
```


## findSlot function
### find user's available time slot
```bash
Required JSON key:
userIds              : list of users' ID
duration             : how long the event is
dates                : list of 2 dates, starting and ending date

Example of JSON      : {
   userIds     : ["yoshi_pika", "mario_torch", "luigi_toto"],
   duration    : "01:00:00",
   dates       : ["2019-10-01", "2019-10-01"]
}

Indicators: 
duration : "HH:mm:ss"
dates    : [start, end]

Returned JSON format:
status   : 0 => failed operation 
           1 => successful operation
           2 => failed operation, no available timeslot
if operation is successful
availableTime  : list of available time slot
rescheduleId   : 0 => no reschedule
               transactionId => reschedule 
```


## getUserData function
### get user data
```bash
Required JSON key:
userId               : user's ID

Returned JSON format:
status   : 0  => failed operation 
           1  => successful operation
userData : JSON object of user data from firestore
```


## loginUser function
### user login on the firestore
```bash
Required JSON key:
userId   : user's ID
password : user's password

Returned JSON format:
status   : 0 => failed login, wrong password 
           1 => successful login
           2 => failed login, user not found
```


## modifyEvent function
### modify event info (except those related to time slot)
```bash
Required JSON key:
eventId                : event's ID
eventData              : {
   location: "new location",
   remarks: "new remarks",
   title: "new title"
}
Do not pass in the key value if there is no modification needed
eg. if you want to change only the location, pass only the location

Returned JSON format:
status   : 0  => failed operation 
           1  => successful operation
```


## resetLock function
### reset the lock on the firestore
```bash
Required JSON key:
None

Returned JSON format:
message  : "lock reset successfully"
```


## setEvent function
### set event for different users
```bash
Required JSON key:
userIds              : list of users' ID
new_event            : JSON object of new event to be added

Example of JSON      : {
     userIds     : ["yoshi_pika", "mario_torch", "luigi_toto"],
     new_event   : {
     date    : "2019-10-01",
     timeslot: ["20:00:00", "21:00:00"],
     host    : "yoshi_pika",
     location: "",
     title   : "Pre Competition meeting",
     remarks : ""
   }
}

Returned JSON format:
status             : -1  => server is busy
                     0  => failed operation 
                     1  => successful operation
suggested_location : one suggested location
```


## updateFriends function
### update user's friends on the firestore
```bash
Required JSON key:
operation: 0 => remove friends
           1 => add friends
userId   : user's ID
friends  : list of friends

Returned JSON format:
status   : 0 => failed operation
           1 => successful operation
```


## updateSchedule function
### update user's schedule on the firestore, MUST pass ALL ROUTINES to this function
```bash
Required JSON key:
userId               : user's ID
routines             : list of user's routines
example of routines  : [{
   date: ["2019-09-23", "2019-10-23"],
   day: 5,
   repeat: 3,
   timeslot: ["08:00", "09:00"],
   title: "COMP5330",
   remarks: "some random new course",
   location: "KKL312",
   importance: "very important"
}, {...}]
Indicators: 
days => 0 = Sunday         repeat => 0 = None
        1 = Monday                   1 = Daily
        2 = Tuesday                  2 = Weekly
        3 = Wednesday                3 = Monthly
        4 = Thursday
        5 = Friday
        6 = Saturday

Returned JSON format:
status   : 0 => failed operation, routines is empty 
           1 => successful operation
           2 => failed operation
```

## resetlock function
### resetLock function, use only when the lock is stuck

------

## Flow of reschedule 
1. Reschedule is needed when you use the findSlot function and it returns a reschedule id (transaction id)
2. Upon receiving the request, if the user is happy with the timeslot made possible from reschedule, then prompt the users the same thing for setEvent, and call the acceptRescheduleSolution function
3. When acceptRescheduleSolution is called, hosts of victim events will have a notification under notification.rescheduleRequest and reschedule_req will store the transaction ids
4. Hosts of victim events will have to respond to the request, call from victim events' hosts side approveReschedule function either to approve the reschedule or disapprove it
5. After all the host has responded to the request, other operations will run accordingly, please refer to approveReschedule documentation for more information


## Notification session in users
* newly added notification session under users
* separated into 4 categories namely:
  * rescheduleRequest : populated when there is a reschedule request
```
format: 
{
    eventId             : event's id
    reschedule_start    : start time in format "YYYY-MM-DD HH:mm:ss"
    reschedule_end      : end time in format "YYYY-MM-DD HH:mm:ss"
}
```
  * newEvent          : populated when new event is added to the users
```
format: 
{
    eventId             : event's id
    start               : start time in format "YYYY-MM-DD HH:mm:ss"
    end                 : end time in format "YYYY-MM-DD HH:mm:ss"
}
```
  * rescheduleSuccess : populated upon success or fail reschedule request
```
format: 
{
    eventId             : event's id if success, "fail" if fail to reschedule
    start               : start time in format "YYYY-MM-DD HH:mm:ss"
    end                 : end time in format "YYYY-MM-DD HH:mm:ss"
}
```
  * rescheduleEvent   : populated when there is an event being rescheduled
```
format: 
{
    eventId             : event's id
    reschedule_start    : start time in format "YYYY-MM-DD HH:mm:ss"
    reschedule_end      : end time in format "YYYY-MM-DD HH:mm:ss"
}
```
* Please call clearNotification function after getUserData function to clear the notification (unless you want to keep the notification piling up)
