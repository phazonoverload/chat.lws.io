let session, camera, screen;

const register = document.getElementById("register");
const landing = document.getElementById("landing");
const call = document.getElementById("call");
const screenStart = document.getElementById("screenStart");
const screenEnd = document.getElementById("screenEnd");
const newMessage = document.getElementById("new-message");
const messages = document.getElementById("messages")
const lock = document.getElementById("lock")
const unlocked = document.getElementById("unlocked")
const lockStatus = document.getElementById("lock-status")
const roomName = document.getElementById("room-name")

register.addEventListener("submit", async event => {
  try {
    event.preventDefault();

    // Get token & room info
    const url = baseURL() + '/session?code=' + register.elements.code.value;
    const { data: resp } = await axios.post(url);
    const { sessionId, apiKey, token, name, locked } = resp;

    // Handle errors
    if(resp.error) return callback(resp.error)
    if(locked) {
      const key = prompt('🔒 Room is locked. If you have a key, you can still unlock it.')
      const { data: result } = await axios.post(baseURL() + '/validate-key', { key })
      if(!result) return callback('That is not the correct key.')
    }

    // Styling changes
    landing.style.display = 'none'
    call.style.display = 'block'
    lockStatus.innerHTML = locked
    roomName.innerHTML = name
    
    // Check if UI should show screensharing
    const canScreenShare = await checkScreenSharing()
    if(!canScreenShare) {
      screenStart.style.display = 'none'
      screenEnd.style.display = 'none'
    }

    // Create session
    session = OT.initSession(apiKey, sessionId);
    
    // Create main publisher
    camera = OT.initPublisher( 'publishers', { insertMode: 'append' }, callback);

    // Publish camera on connection
    session.connect(token, error => {
      if(error) callback(error);
      else session.publish(camera, callback);
    })

    // Subscribe to new streams
    session.on('streamCreated', event => {
      session.subscribe(event.stream, 'subscribers', { insertMode: 'append' }, callback);
    })
    
    // Handle incoming signals
    session.on('signal:message', event => {
      newChatMessage(event.data)
    })

  } catch(err) {
    callback(err)
  }
})

// Screensharing

screenStart.addEventListener('click', event => {
  screen = OT.initPublisher(
    'publishers', 
    { insertMode: 'append', videoSource: 'screen', publishAudio: true }, 
    callback
  );
  session.publish(screen, callback);
})

screenEnd.addEventListener('click', event => {
  screen.destroy();
})

// Text chat

newMessage.addEventListener('submit', event => {
  event.preventDefault();
  session.signal(
    { type: 'message', data: newMessage.elements.message.value },
    () => { newMessage.elements.message.value = '' }
  )
})

const newChatMessage = text => {
  messages.innerHTML = `<li>${text}</li>` + messages.innerHTML
}

// Lock/Unlock Room

lock.addEventListener('click', async event => {
  editLockStatus(true)
})

unlock.addEventListener('click', async event => {
  editLockStatus(false)
})

const editLockStatus = async status => {
  try {
    await axios.post(baseURL() + '/lock', { code: register.elements.code.value, locked: status });
    lockStatus.innerHTML = status
  } catch(err) {
    callback(err)
  }
}

// Helpers

const baseURL = () => {
  const h = location.hostname;
  const isLocal = h == '127.0.0.1' || h == 'localhost';
  return isLocal ? 'http://localhost:9000' : '#'
}

const callback = error => {
  if(error) alert(error);
}

const checkScreenSharing = () => {
  return new Promise((resolve, reject) => {
    try {
      OT.checkScreenSharingCapability(response => {
        if (!response.supported || response.extensionRegistered === false || response.extensionInstalled === false) {
          reject(false);
        } else {
          resolve(true)
        }
      })
    } catch(err) {
      reject(err)
    }
  })
}