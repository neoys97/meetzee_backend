var MongoClient = require("mongodb").MongoClient;
var f = require("util").format;
var fs = require("fs");
let response;
 
let cachedDb = null;

function connectToDocumentDB() {
    console.log("connecting to documentDB");
    var ca = [fs.readFileSync("rds-combined-ca-bundle.pem")];
    if (cachedDb) {
        return Promise.resolve(cachedDb);
    }
    return MongoClient.connect(
        '<documentDB path>', 
        { ssl: true, sslCA: ca, useNewUrlParser: true, useUnifiedTopology: true }
    ).then(db => {
        console.log("Connection established");
        cachedDb = db;
        return cachedDb;
    });
}

function connectToLocalhostDB() {
    console.log("connecting to localhostDB");
    if (cachedDb) {
        return Promise.resolve(cachedDb);
    }
    return MongoClient.connect(
        'mongodb://localhost:27017', 
    ).then(db => {
        console.log("Connection established");
        cachedDb = db;
        return cachedDb;
    });
}

lambdaHandler = async (event, context) => {
    const client = await connectToDocumentDB();
    console.log("success");
    const db = client.db("meetzee");
    const collection = db.collection("test");
    collection.insertOne ({'status': 'success'}).then(result => console.log(result));
    client.close();
    client.close();
};

debug = async() => {
    const client = await connectToLocalhostDB();
    console.log("success");
    const db = client.db("meetzee");
    const collection = db.collection("test");
    collection.insertOne ({'status': 'success'}).then(result => console.log(result));
    client.close();
}

module.exports = {
    lambdaHandler,
    debug
}