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

    const { code, locked } = JSON.parse(event.body);
    await mongo.connect();
    const sessions = await mongo.db('chat').collection('sessions');
    const session = await sessions.findOne({ code })
    if(!session) {
      return { headers, statusCode: 200, body: JSON.stringify({error: 'No room with code'}) }
    } else {
      await sessions.update({ code }, { $set: { locked } })
      return { headers, statusCode: 200, body: JSON.stringify({message: 'Updated', status: locked}) }
    }
  } catch(e) {
    console.error('Error', e)
    return { headers, statusCode: 500, body: 'Error: ' + e }
  }
}