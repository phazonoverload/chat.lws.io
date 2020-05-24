const app = new Vue({
  el: '#app',
  data: {
    ui: {
      pane: 'landing', // 'landing', 'call'
      showScreenShare: false,
    },
    landing: {
      code: ''
    },
    ot: {
      state: {},
      session: undefined,
      publishers: {
        camera: undefined,
        screen: { id: null }
      },
    },
    messaging: {
      new: '',
      list: []
    }
  },
  created() {
    this.enterRoom()
  },
  methods: {
    async enterRoom() {
      try {
        const code = this.landing.code
        if(this.checkCodeIsPresent(code)) {
          await this.getToken()
          if(await this.checkToken()) {
            this.changeUIPane('call')
            await this.checkScreenshare()
            this.initSession()
            this.listenForSessionEvents()
          }
        }
      } catch(err) {
        alert(err)
      }
    },
    checkCodeIsPresent(code) {
      if(code.length == 0) {
        alert('You must provide a ✨ Magic Meeting Code ✨')
        return false
      } else {
        return true
      }
    },
    async getToken() {
      return new Promise(async (resolve, reject) => {
        try {
          const { data } = await axios.post(`${this.baseURL}/session?code=${this.landing.code}`)
          this.ot.state = data;
          resolve()
        } catch(err) {
          reject(err)
        }
      })
    },
    async checkToken() {
      return new Promise(async (resolve, reject) => {
        try {
          if(!this.ot.state.sessionId) {
            alert('Not a valid ✨ Magic Meeting Code ✨')
            resolve(false)
          }
          if(this.ot.state.locked) {
            const key = prompt('🔒 Room is locked. If you have a key, you can still unlock it.')
            const { data } = await axios.post(`${this.baseURL}/validate-key`, { key })
            if(data) {
              resolve(true)
            } else {
              alert('🚫 That is not the right key')
              resolve(false)
            }
          }
          resolve(true)
        } catch(err) {
          reject(err)
        }
      })
    },
    checkScreenshare() {
      return new Promise((resolve, reject) => {
        OT.checkScreenSharingCapability(response => {
          const s = !(!response.supported || response.extensionRegistered === false || response.extensionInstalled === false);
          this.ui.showScreenShare = s;
          resolve(s);
        })
      })
    },
    changeUIPane(pane) {
      this.ui.pane = pane
    },
    initSession() {
      const { apiKey, sessionId, token } = this.ot.state;
      this.ot.session = OT.initSession(apiKey, sessionId);
      
      const { session, publishers } = this.ot;
      publishers.camera = OT.initPublisher( 
        'publishers',
        { insertMode: 'append', width: '200px', height: '150px' }, 
        err => { if(err) alert(err); }
      );
      session.connect(token, err => {
        if(err) alert(err);
        else session.publish(publishers.camera, err => {
          if(err) alert(err);
        });
      })
    },
    listenForSessionEvents() {
      const { session } = this.ot;
      session.on('streamCreated', event => {
        const videoStream = event.stream.channel.find(c => c.type == 'video')
        const source = videoStream.source;
        console.log(source); // camera | screen
        session.subscribe(
          event.stream, 
          'subscribers', 
          { 
            insertMode: 'append', 
            width: source == 'screen' ? '200%' : '100%',
            height: '100%' 
          }, 
          err => { if(err) alert(err) }
        );
      })
      session.on('signal:message', event => {
        this.receiveMessage(event.data)
      })
    },
    sendMessage() {
      if(this.messaging.new.length > 0) {
        this.ot.session.signal(
          { type: 'message', data: this.messaging.new },
          () => { this.messaging.new = '' }
        )
      }
    },
    receiveMessage(message) {
      this.messaging.list.unshift(message)
    },
    toggleScreenshare() {
      if(!this.ot.publishers.screen?.stream) {
        this.ot.publishers.screen = OT.initPublisher(
          'publishers', 
          { 
            insertMode: 'append', 
            videoSource: 'screen', 
            publishAudio: true,
            width: '200px', 
            height: '150px' 
          }
        );
        this.ot.session.publish(this.ot.publishers.screen);
      } else {
        this.ot.publishers.screen.destroy()
      }
    },
    async toggleLock() {
      try {
        const locked = !this.ot.state.locked;
        await axios.post(`${this.baseURL}/lock`, { code: this.landing.code, locked })
        this.ot.state.locked = locked;
      } catch(err) {
        alert(err)
      }
    },
  },
  computed: {
    baseURL() {
      const h = location.hostname;
      const isLocal = h == '127.0.0.1' || h == 'localhost';
      return isLocal ? 'http://localhost:9000' : 'https://chat.lws.io/.netlify/functions'
    }
  }
})