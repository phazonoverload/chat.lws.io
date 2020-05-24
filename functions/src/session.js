require('dotenv').config()

const { MongoClient } = require('mongodb')
const mongo = new MongoClient(process.env.DB_URL, { useUnifiedTopology: true })
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

    const { code } = event.queryStringParameters
    await mongo.connect()
    const sessions = await mongo.db('chat').collection('sessions')
    const session = await sessions.findOne({ code })

    if(session) {
      const token = OT.generateToken(session.sessionId, { role: 'publisher' })
      return { headers, statusCode: 200, body: JSON.stringify({ ...session, token, apiKey: process.env.VONAGE_KEY}) }
    } else {
      return { headers, statusCode: 200, body: JSON.stringify({ error: 'Code does not exist' }) }
    }
  } catch(e) {
    console.error('Error', e)
    return { headers, statusCode: 500, body: 'Error: ' + e }
  }
}