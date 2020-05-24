require('dotenv').config();

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

    const { key } = JSON.parse(event.body);
    return { headers, statusCode: 200, body: String(key == process.env.LOCK_KEY) }
  } catch(e) {
    console.error('Error', e)
    return { headers, statusCode: 500, body: 'Error: ' + e }
  }
}