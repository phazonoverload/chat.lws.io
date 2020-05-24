const prompt = require('prompt');
const axios = require('axios');

const properties = [
  {
    name: 'code',
    validator: /^[a-zA-Z\s\-]+$/,
    warning: 'Code must be only letters, spaces, or dashes'
  },
  {
    name: 'name'
  }
]

prompt.message = '👉';
prompt.delimiter = ' '
prompt.start();

prompt.get(properties, async (err, result) => {
  if(err) return console.log(err);
  const { data } = await axios.post('https://chat.lws.io/.netlify/functions/create', result)
  console.log(data);
})