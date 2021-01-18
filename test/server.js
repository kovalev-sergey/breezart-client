const net = require('net')
const { once } = require('events')
const { hexToDec, isHex } = require('../util/hex')

const RESP_PROPERTIES = [
  'VPr07',
  '2C06', // TempMin = 6, TempMax = 44 (0010 1100 0000 0110)
  '906', // SpeedMin = 6, SpeedMax = 9 (0000 1001 0000 0110)
  '6301', // HumidMin = 1, HumidMax = 99 (0110 0011 0000 0001)
  'D413', // NVAVZone = 19, reserv[5,7] = 0, VAVMode = 0, IsRegPressVAV = 0, IsShowHum = 1, IsCascRegT = 0, IsCascRegH = 1, IsHumid = 0, IsCooler = 1, IsAuto = 1 (1101 0100 0001 0011)
  'FE02', // ProtSubVers = 2, ProtVers = 254 (1111 1110 0000 0010)
  'FD03', // LoVerTPD = 3, HiVerTPD = 253 (1111 1101 0000 0011)
  'EA60' // Firmware_Ver = 60000 (1110 1010 0110 0000)
]

class TestServer {
  constructor () {
    this.connections = {}
    this._forceResponse = null // overrider
    this.server = net.createServer((socket) => {
      socket.on('data', (data) => {
        this.reqHandler(socket, data)
      })
      socket.on('end', () => {
        console.log('server socket end')
      })

      socket.on('error', () => {
        console.log('server socket error')
      })
    })
    this.server.on('error', err => {
      console.log(err.stack)
    })

    this.server.on('connection', (socket) => {
      const key = socket.remoteAddress + ':' + socket.remotePort
      this.connections[key] = socket

      socket.on('close', () => {
        console.log('server socket close')
        delete this.connections[key]
      })

      socket.on('error', err => {
        console.log(err.stack)
      })
    })
  }

  reqHandler (socket, data) {
    // send force response if exist
    const fResp = this.forceResponse
    if (fResp) {
      socket.write(fResp)
      return
    }

    // Check the req stucture
    const req = data.toString().split('_')
    if (req.lenght < 2) {
      socket.write(`VEFrm_${data}`)
      return
    }
    for (let r = 1; r < req.length; r++) {
      // TODO: the first param in the request is not checked.
      const element = req[r]
      if (!isHex(element)) {
        socket.write(`VEFrm_${data}`)
        return
      }
    }
    // second part of the req hould alwais be the pwd
    // Check the password
    const pwd = req[1]
    if (hexToDec(pwd) !== this.password) {
      socket.write('VEPas')
      return
    }

    const cmd = req[0]
    // handle a Properties
    switch (cmd) {
      case 'VPr07': { // properties
        const res = RESP_PROPERTIES.join('_')
        socket.write(res)
        break
      }
      case 'VWSpd': { // set fan speed
        const speedTarget = Number(req[2])
        if (Number.isNaN(speedTarget)) {
          socket.write('VEDat_E1')
        } else if (speedTarget > 9) {
          socket.write('VEDat_H1')
        } else if (speedTarget < 6) {
          socket.write('VEDat_L1')
        } else {
          socket.write(`OK_VWSpd_${speedTarget}`)
        }
        break
      }
      default:
        break
    }
  }

  async start () {
    console.log('start server')
    this.server.listen(0, 'localhost')
    return once(this.server, 'listening')
  }

  async stop () {
    console.log('stop server')
    this.server.close()
    for (const key in this.connections) {
      console.log(`The client ${key} did not disconnect. Force close.`)
      this.connections[key].destroy()
    }
    return once(this.server, 'close')
  }

  get port () {
    return this.server.address().port
  }

  get host () {
    return 'localhost'
  }

  get password () {
    return 38734 // like random
  }

  get connectionOptions () {
    return {
      host: this.host,
      port: this.port,
      password: this.password

    }
  }

  get forceResponse () {
    const res = this._forceResponse
    this._forceResponse = null
    return res
  }

  set forceResponse (value) {
    this._forceResponse = value
  }
}

module.exports = TestServer
