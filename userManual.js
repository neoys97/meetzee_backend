/**
 * Flow of reschedule 
 * 1. Reschedule is needed when you use the findSlot function and it returns a reschedule id (transaction id)
 * 2. Upon receiving the request, if the user is happy with the timeslot made possible from reschedule, then prompt the users
 *    the same thing for setEvent, and call the acceptRescheduleSolution function
 * 3. When acceptRescheduleSolution is called, hosts of victim events will have a notification under 
 *    notification.rescheduleRequest and reschedule_req will store the transaction ids
 * 4. Hosts of victim events will have to respond to the request, call from victim events' hosts side approveReschedule function 
 *    either to approve the reschedule or disapprove it
 * 5. After all the host has responded to the request, other operations will run accordingly, please refer to approveReschedule
 *    documentation for more information
 */

/**
 * Notification session in users
 * - newly added notification session under users
 * - separated into 4 categories namely:
 *      - rescheduleRequest : populated when there is a reschedule request
 *          - format: {
 *                  eventId             : event's id
 *                  reschedule_start    : start time in format "YYYY-MM-DD HH:mm:ss"
 *                  reschedule_end      : end time in format "YYYY-MM-DD HH:mm:ss"
 *              }
 *      - newEvent          : populated when new event is added to the users
 *          - format: {
 *                  eventId             : event's id
 *                  start               : start time in format "YYYY-MM-DD HH:mm:ss"
 *                  end                 : end time in format "YYYY-MM-DD HH:mm:ss"
 *              }
 *      - rescheduleSuccess : populated upon success or fail reschedule request
 *          - format: {
 *                  eventId             : event's id if success, "fail" if fail to reschedule
 *                  start               : start time in format "YYYY-MM-DD HH:mm:ss"
 *                  end                 : end time in format "YYYY-MM-DD HH:mm:ss"
 *              }
 *      - rescheduleEvent   : populated when there is an event being rescheduled
 *          - format: {
 *                  eventId             : event's id
 *                  reschedule_start    : start time in format "YYYY-MM-DD HH:mm:ss"
 *                  reschedule_end      : end time in format "YYYY-MM-DD HH:mm:ss"
 *              }
 * - Please call clearNotification function after getUserData function to clear the notification (unless you want to keep 
 *   the notification piling up)
 */

/**
 * resetLock function, use only when the lock is stuck
 */