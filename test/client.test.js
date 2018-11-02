/* eslint-env mocha */
process.env.NODE_ENV = 'test'

let expect = require('chai').expect
let Client = require('../index')
const net = require('net')

let server

server = net.createServer((socket) => {
  // console.log('Client connected')
  socket.on('error', (err) => {
    if (err.code === 'ECONNRESET') return
    throw err
  })

  socket.on('data', (chunk) => {
    console.log('Server receive:', chunk.toString())
    socket.write(`OK\r\n`)
    socket.end()
    server.close()
  })

  socket.write('/ #\r\n')
})

describe('Options test', () => {
  it('Options must have an ip', () => {
    expect(() => new Client()).to.throw('IP address not set')
  })

  it('Options must have a port', () => {
    var cl = new Client({ 'ip': '127.0.0.1' })
    expect(cl).have.nested.property('options.port')
  })

  it('Adding custom property', () => {
    let cl = new Client({ 'ip': '127.0.0.1', 'custom': true })
    expect(cl).have.nested.property('options.custom')
    expect(cl.options.custom).have.to.be.equal(true)
  })
})

describe('Request construct test', () => {
  it('Check assections', () => {
    let cl = new Client({ 'ip': '127.0.0.1', 'password': 65535 })
    let req = cl.constructRequest(Client.RequestPrefix.STATE, null)
    expect(req).have.to.be.equal('VSt07_ffff')
  })
})

describe('Connection test', () => {
  it('makeRequest STATE', function (done) {
    this.timeout(5000)

    let server = net.createServer((socket) => {
      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') return
        throw err
      })

      socket.on('data', (chunk) => {
        socket.write(Client.RequestPrefix.STATE + '_OK')
        socket.end()
        server.close()
      })

      socket.write('/ #\r\n')
    })

    server.listen({ host: 'localhost', port: 1560 }, () => {
      let cl = new Client({ 'ip': '127.0.0.1', 'password': 66 })
      cl.connect()
      cl.makeRequest(Client.RequestPrefix.STATE, null, (err, res) => {
        expect(err).have.to.be.equal(null)
        expect(res[0]).have.to.be.equal(Client.RequestPrefix.STATE)
        done()
      })
    })
  })

  it('makeRequest PROPERTIES', function (done) {
    this.timeout(5000)

    // Response is array from `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
    let propResponse = []
    propResponse.push('VPr07')
    propResponse.push('2C06') // TempMin = 6, TempMax = 44 (0010 1100 0000 0110)
    propResponse.push('906') // SpeedMin = 6, SpeedMax = 9 (0000 1001 0000 0110)
    propResponse.push('6301') // HumidMin = 1, HumidMax = 99 (0110 0011 0000 0001)
    propResponse.push('D413') // NVAVZone = 19, reserv[5,7] = 0, VAVMode = 0, IsRegPressVAV = 0, IsShowHum = 1, IsCascRegT = 0, IsCascRegH = 1, IsHumid = 0, IsCooler = 1, IsAuto = 1 (1101 0100 0001 0011)
    propResponse.push('FE02') // ProtSubVers = 2, ProtVers = 254 (1111 1110 0000 0010)
    propResponse.push('FD03') // LoVerTPD = 3, HiVerTPD = 253 (1111 1101 0000 0011)
    propResponse.push('EA60') // Firmware_Ver = 60000 (1110 1010 0110 0000)

    let server = net.createServer((socket) => {
      socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') return
        throw err
      })

      socket.on('data', (chunk) => {
        socket.write(propResponse.join(Client.DELIMITER))
        socket.end()
        server.close()
      })

      socket.write('/ #\r\n')
    })

    server.listen({ host: 'localhost', port: 1560 }, () => {
      let cl = new Client({ 'ip': '127.0.0.1', 'password': 66 })
      cl.connect()

      expect(cl.TempMin).have.to.be.equal(null)
      expect(cl.TempMax).have.to.be.equal(null)
      expect(cl.SpeedMin).have.to.be.equal(null)
      expect(cl.SpeedMax).have.to.be.equal(null)
      expect(cl.HumidMin).have.to.be.equal(null)
      expect(cl.HumidMax).have.to.be.equal(null)

      expect(cl.NVAVZone).have.to.be.equal(null)
      expect(cl.VAVMode).have.to.be.equal(null)
      expect(cl.IsRegPressVAV).have.to.be.equal(null)
      expect(cl.IsShowHum).have.to.be.equal(null)
      expect(cl.IsCascRegT).have.to.be.equal(null)
      expect(cl.IsCascRegH).have.to.be.equal(null)
      expect(cl.IsHumid).have.to.be.equal(null)
      expect(cl.IsCooler).have.to.be.equal(null)
      expect(cl.IsAuto).have.to.be.equal(null)

      expect(cl.ProtSubVers).have.to.be.equal(null)
      expect(cl.ProtVers).have.to.be.equal(null)
      expect(cl.LoVerTPD).have.to.be.equal(null)
      expect(cl.HiVerTPD).have.to.be.equal(null)
      expect(cl.Firmware_Ver).have.to.be.equal(null)

      cl.getProperties(() => {
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

        done()
      })
    })
  })
})
