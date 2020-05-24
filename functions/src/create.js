require('dotenv').config();

const { MongoClient } = require('mongodb');
const mongo = new MongoClient(process.env.DB_URL, { useUnifiedTopology: true });
const OpenTok = require("opentok");
const OT = new OpenTok(process.env.VONAGE_KEY, process.env.VONAGE_SECRET);

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
}

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod == 'OPTIONS') {
      return { 
        headers: { ...headers, 'Allow': 'POST' }, 
        statusCode: 204 
      }
    }

    const { code, name } = JSON.parse(event.body);
    if(!code || !name) throw 'Must provide code and name'
    await mongo.connect();
    const sessions = await mongo.db('chat').collection('sessions');
    const existingSession = await sessions.findOne({ code })
    if(existingSession) {
      return { headers, statusCode: 200, body: JSON.stringify({error: 'Meeting code already exists'}) }
    } else {
      const sessionId = await createSession();
      await sessions.insertOne({ sessionId, code, name, locked: false });
      return { headers, statusCode: 200, body: JSON.stringify({message: 'Meeting code created'}) }
    }
  } catch(e) {
    console.error('Error', e)
    return { headers, statusCode: 500, body: 'Error: ' + e }
  }
}

const createSession = () => {
  return new Promise((resolve, reject) => {
    try {
      OT.createSession((err, session) => {
        if(err) { throw err }
        resolve(session.sessionId)
      })
    } catch(err) {
      reject(err)
    }
  })
}