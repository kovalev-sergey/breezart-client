/* eslint-env mocha */
process.env.NODE_ENV = 'test'

const expect = require('chai').expect
const Client = require('../index')
const net = require('net')

// let server

// server = net.createServer((socket) => {
//   // console.log('Client connected')
//   socket.on('error', (err) => {
//     if (err.code === 'ECONNRESET') return
//     throw err
//   })

//   socket.on('data', (chunk) => {
//     console.log('Server receive:', chunk.toString())
//     socket.write(`OK\r\n`)
//     socket.end()
//     server.close()
//   })

//   socket.write('/ #\r\n')
// })

describe('Options test', () => {
  it('Options must have an host', () => {
    expect(() => new Client()).to.throw('Host is not set')
  })

  it('Options must have a port', () => {
    const cl = new Client({ host: '127.0.0.1', password: 12345 })
    expect(cl).have.nested.property('options.port')
  })

  it('Adding custom property', () => {
    const cl = new Client({ host: '127.0.0.1', password: 12345, custom: true })
    expect(cl).have.nested.property('options.custom')
    expect(cl.options.custom).have.to.be.equal(true)
  })
})

describe('Request construct test', () => {
  it('Check assections', () => {
    const cl = new Client({ host: '127.0.0.1', password: 65535 })
    const req = cl.constructRequest(Client.RequestType.GET_STATE, null)
    expect(req).have.to.be.equal('VSt07_ffff')
  })
})

describe('Split device message', () => {
  it('Split it', () => {
    const cl = new Client({ host: '127.0.0.1', password: 65535 })
    const mes = 'VSens__e6_fb07_fb07_fb07_fb07_fb07_fb07_0'
    const req = cl.splitMessage(mes)
    console.log(req)
    // expect(req.length).have.to.be.equal(10)
  })
})

describe('Connection test', () => {
  it('makeRequest PROPERTIES', function (done) {
    this.timeout(5000)

    // Response is array from `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
    const propResponse = []
    propResponse.push('VPr07')
    propResponse.push('2C06') // TempMin = 6, TempMax = 44 (0010 1100 0000 0110)
    propResponse.push('906') // SpeedMin = 6, SpeedMax = 9 (0000 1001 0000 0110)
    propResponse.push('6301') // HumidMin = 1, HumidMax = 99 (0110 0011 0000 0001)
    propResponse.push('D413') // NVAVZone = 19, reserv[5,7] = 0, VAVMode = 0, IsRegPressVAV = 0, IsShowHum = 1, IsCascRegT = 0, IsCascRegH = 1, IsHumid = 0, IsCooler = 1, IsAuto = 1 (1101 0100 0001 0011)
    propResponse.push('FE02') // ProtSubVers = 2, ProtVers = 254 (1111 1110 0000 0010)
    propResponse.push('FD03') // LoVerTPD = 3, HiVerTPD = 253 (1111 1101 0000 0011)
    propResponse.push('EA60') // Firmware_Ver = 60000 (1110 1010 0110 0000)

    const server = net.createServer((socket) => {
      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') return
        throw err
      })

      socket.on('data', (chunk) => {
        socket.write(propResponse.join(Client.DELIMITER))
        socket.end()
        server.close()
      })

      socket.on('connection', () => {
        socket.write('/ #\r\n')
      })
    })

    server.listen({ host: 'localhost', port: 15600 }, () => {
      const cl = new Client({ host: '127.0.0.1', port: 15600, password: 66 })
      cl.on('connect', () => {
        expect(cl.TempMin).have.to.be.equal(6)
        expect(cl.TempMax).have.to.be.equal(44)
        expect(cl.SpeedMin).have.to.be.equal(6)
        expect(cl.SpeedMax).have.to.be.equal(9)
        expect(cl.HumidMin).have.to.be.equal(1)
        expect(cl.HumidMax).have.to.be.equal(99)

        expect(cl.NVAVZone).have.to.be.equal(19)
        expect(cl.VAVMode).have.to.be.equal(0)
        expect(cl.IsRegPressVAV).have.to.be.equal(0)
        expect(cl.IsShowHum).have.to.be.equal(1)
        expect(cl.IsCascRegT).have.to.be.equal(0)
        expect(cl.IsCascRegH).have.to.be.equal(1)
        expect(cl.IsHumid).have.to.be.equal(0)
        expect(cl.IsCooler).have.to.be.equal(1)
        expect(cl.IsAuto).have.to.be.equal(1)

        expect(cl.ProtSubVers).have.to.be.equal(2)
        expect(cl.ProtVers).have.to.be.equal(254)
        expect(cl.LoVerTPD).have.to.be.equal(3)
        expect(cl.HiVerTPD).have.to.be.equal(253)
        expect(cl.Firmware_Ver).have.to.be.equal(60000)
        cl.disconnect()
        done()
      })
      cl.connect()
    })
  })
})

describe('Errors test', () => {
  it('if returned error, shoul be emit error', function (done) {
    this.timeout(5000)

    // Response is array from `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
    const propResponse = []
    propResponse.push('VEPas')

    const server = net.createServer((socket) => {
      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') return
        throw err
      })

      socket.on('data', (chunk) => {
        socket.write(propResponse.join(Client.DELIMITER))
        socket.end()
        server.close()
      })

      socket.on('connection', () => {
        socket.write('/ #\r\n')
      })
    })

    server.listen({ host: 'localhost', port: 15600 }, () => {
      const cl = new Client({ host: '127.0.0.1', port: 15600, password: 66 })
      cl.on('error', (err) => {
        expect(err.message).have.to.be.equal(`${Client.ErrorPrefix.VEPas}, ${propResponse}`)
        done()
      })
      cl.connect()
    })
  })
  it('if returned error, shoul be emit error 2', function (done) {
    this.timeout(5000)

    // Response is array from `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
    const propResponse = []
    propResponse.push('VEDat')
    propResponse.push('L2')

    const server = net.createServer((socket) => {
      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') return
        throw err
      })

      socket.on('data', (chunk) => {
        socket.write(propResponse.join(Client.DELIMITER))
        socket.end()
        server.close()
      })

      socket.on('connection', () => {
        socket.write('/ #\r\n')
      })
    })

    server.listen({ host: 'localhost', port: 15600 }, () => {
      const cl = new Client({ host: '127.0.0.1', port: 15600, password: 66 })
      cl.on('error', (err) => {
        expect(err.message).have.to.be.equal(`${Client.ErrorPrefix.VEDat}, ${propResponse.join(Client.DELIMITER)}`)
        done()
      })
      cl.connect()
    })
  })
})

describe('Fan speed test', () => {
  it('change speed', function (done) {
    this.timeout(5000)

    // Response is array from `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
    // For init the instance
    const propResponse = []
    propResponse.push('VPr07')
    propResponse.push('2C06') // TempMin = 6, TempMax = 44 (0010 1100 0000 0110)
    propResponse.push('906') // SpeedMin = 6, SpeedMax = 9 (0000 1001 0000 0110)
    propResponse.push('6301') // HumidMin = 1, HumidMax = 99 (0110 0011 0000 0001)
    propResponse.push('D413') // NVAVZone = 19, reserv[5,7] = 0, VAVMode = 0, IsRegPressVAV = 0, IsShowHum = 1, IsCascRegT = 0, IsCascRegH = 1, IsHumid = 0, IsCooler = 1, IsAuto = 1 (1101 0100 0001 0011)
    propResponse.push('FE02') // ProtSubVers = 2, ProtVers = 254 (1111 1110 0000 0010)
    propResponse.push('FD03') // LoVerTPD = 3, HiVerTPD = 253 (1111 1101 0000 0011)
    propResponse.push('EA60') // Firmware_Ver = 60000 (1110 1010 0110 0000)

    const server = net.createServer((socket) => {
      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') return
        throw err
      })

      socket.on('data', (chunk) => {
        const resp = chunk.toString().split('_')

        if (resp[0] === 'VPr07') {
          socket.write(propResponse.join(Client.DELIMITER))
        } else {
          socket.write('OK_VWSpd_7')
          socket.end()
          server.close()
        }
      })

      socket.on('connection', () => {
        socket.write('/ #\r\n')
      })
    })

    server.listen({ host: 'localhost', port: 15600 }, () => {
      const cl = new Client({ host: '127.0.0.1', port: 15600, password: 66 })
      cl.on('connect', () => {
        const targetSpeed = 7
        cl.setFanSpeed(targetSpeed, (err, val) => {
          expect(err).have.to.be.equal(null)
          expect(val).have.to.be.equal(7)
          cl.disconnect()
          server.close()
          done()
        })
      })
      cl.connect()
    })
  })

  it('change speed with wrong val', function (done) {
    this.timeout(5000)

    // Response is array from `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
    // For init the instance
    const propResponse = []
    propResponse.push('VPr07')
    propResponse.push('2C06') // TempMin = 6, TempMax = 44 (0010 1100 0000 0110)
    propResponse.push('906') // SpeedMin = 6, SpeedMax = 9 (0000 1001 0000 0110)
    propResponse.push('6301') // HumidMin = 1, HumidMax = 99 (0110 0011 0000 0001)
    propResponse.push('D413') // NVAVZone = 19, reserv[5,7] = 0, VAVMode = 0, IsRegPressVAV = 0, IsShowHum = 1, IsCascRegT = 0, IsCascRegH = 1, IsHumid = 0, IsCooler = 1, IsAuto = 1 (1101 0100 0001 0011)
    propResponse.push('FE02') // ProtSubVers = 2, ProtVers = 254 (1111 1110 0000 0010)
    propResponse.push('FD03') // LoVerTPD = 3, HiVerTPD = 253 (1111 1101 0000 0011)
    propResponse.push('EA60') // Firmware_Ver = 60000 (1110 1010 0110 0000)

    const server = net.createServer((socket) => {
      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') return
        throw err
      })

      socket.on('data', (chunk) => {
        const resp = chunk.toString().split('_')

        if (resp[0] === 'VPr07') {
          socket.write(propResponse.join(Client.DELIMITER))
        } else {
          socket.write('OK_VWSpd_5')
          socket.end()
          server.close()
        }
      })

      socket.on('connection', () => {
        socket.write('/ #\r\n')
      })
    })

    server.listen({ host: 'localhost', port: 15600 }, () => {
      const cl = new Client({ host: '127.0.0.1', port: 15600, password: 66 })
      cl.on('connect', () => {
        const targetSpeed = 5
        cl.setFanSpeed(targetSpeed, (err) => {
          expect(err.message).have.to.be.equal('The target speed must be between 6 and 9')
          cl.disconnect()
          server.close()
          done()
        })
      })
      cl.connect()
    })
  })

  it('change speed with wrong vavmode', function (done) {
    this.timeout(5000)

    // Response is array from `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
    // For init the instance
    const propResponse = []
    propResponse.push('VPr07')
    propResponse.push('2C06') // TempMin = 6, TempMax = 44 (0010 1100 0000 0110)
    propResponse.push('906') // SpeedMin = 6, SpeedMax = 9 (0000 1001 0000 0110)
    propResponse.push('6301') // HumidMin = 1, HumidMax = 99 (0110 0011 0000 0001)
    propResponse.push('D413') // NVAVZone = 19, reserv[5,7] = 0, VAVMode = 0, IsRegPressVAV = 0, IsShowHum = 1, IsCascRegT = 0, IsCascRegH = 1, IsHumid = 0, IsCooler = 1, IsAuto = 1 (1101 0100 0001 0011)
    propResponse.push('FE02') // ProtSubVers = 2, ProtVers = 254 (1111 1110 0000 0010)
    propResponse.push('FD03') // LoVerTPD = 3, HiVerTPD = 253 (1111 1101 0000 0011)
    propResponse.push('EA60') // Firmware_Ver = 60000 (1110 1010 0110 0000)

    const server = net.createServer((socket) => {
      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') return
        throw err
      })

      socket.on('data', (chunk) => {
        const resp = chunk.toString().split('_')

        if (resp[0] === 'VPr07') {
          socket.write(propResponse.join(Client.DELIMITER))
        } else {
          socket.write('OK_VWSpd_5')
          socket.end()
          server.close()
        }
      })

      socket.on('connection', () => {
        socket.write('/ #\r\n')
      })
    })

    server.listen({ host: 'localhost', port: 15600 }, () => {
      const cl = new Client({ host: '127.0.0.1', port: 15600, password: 66 })
      cl.on('connect', () => {
        const targetSpeed = 5
        cl.VAVMode = 1
        cl.setFanSpeed(targetSpeed, (err) => {
          expect(err.message).have.to.be.equal('VAVMode found. The fan speed can\'t be changed in VAV modes')
          cl.disconnect()
          server.close()
          done()
        })
      })
      cl.connect()
    })
  })
})
