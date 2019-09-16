const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
db.settings({timestampsInSnapshots: true});

exports.lambdaHandler = async (event, context, callback) => {
  // Write a simple document with two fields
  let response;
  const data = {
    message: "Hello, world!",
    timestamp: new Date()
  };

  await db.collection('lambda-docs').add(data).then((ref) => {
    // On a successful write, return an object
    // containing the new doc id.
    console.log("written successfully");
    response = ({
      "statusCode": 200,
      "body": JSON.stringify({
        id: ref.id
      })
    });
  }).catch((err) => {
    // Forward errors if the write fails
     console.log("error occured");
     response = ({
      "statusCode": 500,
      "body": JSON.stringify({
        error: err
      })
    });   
  });
  return response;
}
