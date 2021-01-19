/* eslint-env mocha */
process.env.NODE_ENV = 'test'

const expect = require('chai').expect
const Client = require('../index').BreezartClient
const TestServer = require('./server')

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
    const mes = 'VSens__e6_fb07_fb07_fb07_fb07_fb07_fb07_0' // the two '_' in the response may be a bug or may not be
    const req = cl.splitMessage(mes)
    expect(req.length).have.to.be.equal(9)
  })
})

describe('Connection test', () => {
  const local = new TestServer()

  beforeEach(async () => {
    await local.start()
  })

  afterEach(async () => {
    return local.stop()
  })
  it('makeRequest PROPERTIES', function (done) {
    this.timeout(3000)

    const cl = new Client(local.connectionOptions)
    cl.on('connect', () => {
      expect(cl.TempMin).have.to.be.equal(6)
      expect(cl.TempMax).have.to.be.equal(44)
      expect(cl.SpeedMin).have.to.be.equal(2)
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
    })
    cl.on('disconnect', () => done())
    cl.on('error', err => console.log(err))
    cl.connect()
  })
})

describe('Set fan speed test', () => {
  const local = new TestServer()

  beforeEach(async () => {
    await local.start()
  })

  afterEach(async () => {
    return local.stop()
  })
  it('change speed', function (done) {
    this.timeout(3000)
    const cl = new Client(local.connectionOptions)
    cl.on('connect', () => {
      const targetSpeed = 7
      cl.setFanSpeed(targetSpeed, (err, val) => {
        expect(err).have.to.be.equal(null)
        expect(val).have.to.be.equal(7)
        cl.disconnect()
      })
    })
    cl.on('disconnect', () => done())
    cl.on('error', err => console.log(err))
    cl.connect()
  })

  it('change speed with wrong val', function (done) {
    this.timeout(3000)

    const cl = new Client(local.connectionOptions)
    cl.on('connect', () => {
      const targetSpeed = 1
      cl.setFanSpeed(targetSpeed, (err) => {
        expect(err.message).have.to.be.equal('The target speed must be between 2 and 9')
        cl.disconnect()
      })
    })
    cl.on('disconnect', () => done())
    cl.on('error', err => console.log(err))
    cl.connect()
  })

  it('change speed with wrong vavmode', function (done) {
    this.timeout(5000)

    const cl = new Client(local.connectionOptions)
    cl.on('connect', () => {
      const targetSpeed = 5
      cl.VAVMode = 1
      cl.setFanSpeed(targetSpeed, (err) => {
        expect(err.message).have.to.be.equal('VAVMode found. The fan speed can\'t be changed in VAV modes')
        cl.disconnect()
      })
    })
    cl.on('disconnect', () => done())
    cl.on('error', err => console.log(err))
    cl.connect()
  })
})

describe('Error emitting test', () => {
  const local = new TestServer()

  beforeEach(async () => {
    await local.start()
  })

  afterEach(async () => {
    return local.stop()
  })

  it('if wrong password should emit the error', function (done) {
    this.timeout(3000)
    const opt = local.connectionOptions
    opt.password = 22 // set wrong pass
    const cl = new Client(opt)
    cl.on('error', err => {
      expect(err.message).have.to.be.equal(`${Client.ErrorPrefix.VEPas}, VEPas`)
      cl.disconnect()
    })
    cl.on('disconnect', () => done())
    cl.connect()
  })

  it('if returned error, shoul be emit the error', function (done) {
    this.timeout(3000)
    const resp = 'VEDat_L2'
    local.forceResponse = resp
    const cl = new Client(local.connectionOptions)
    cl.on('error', err => {
      expect(err.message).have.to.be.equal(`${Client.ErrorPrefix.VEDat}, ${resp}`)
      cl.disconnect()
    })
    cl.on('disconnect', () => done())
    cl.connect()
  })
})

describe('Set power test', () => {
  const local = new TestServer()

  beforeEach(async () => {
    await local.start()
  })

  afterEach(async () => {
    return local.stop()
  })
  it('power on', function (done) {
    this.timeout(3000)
    const cl = new Client(local.connectionOptions)
    cl.PwrBtnState = 0
    cl.on('connect', () => {
      const targetPowerOn = true
      cl.setPowerOn(targetPowerOn, (err, val) => {
        expect(err).have.to.be.equal(null)
        expect(val).have.to.be.equal(true)
        cl.disconnect()
      })
    })
    cl.on('disconnect', () => done())
    cl.on('error', err => console.log(err))
    cl.connect()
  })

  it('power off', function (done) {
    this.timeout(3000)
    const cl = new Client(local.connectionOptions)
    cl.PwrBtnState = 1
    cl.on('connect', () => {
      const targetPowerOn = false
      cl.setPowerOn(targetPowerOn, (err, val) => {
        expect(err).have.to.be.equal(null)
        expect(val).have.to.be.equal(false)
        cl.disconnect()
      })
    })
    cl.on('disconnect', () => done())
    cl.on('error', err => console.log(err))
    cl.connect()
  })
})

describe('Set temp test', () => {
  const local = new TestServer()

  beforeEach(async () => {
    await local.start()
  })

  afterEach(async () => {
    return local.stop()
  })
  it('change temp', function (done) {
    this.timeout(3000)
    const cl = new Client(local.connectionOptions)
    cl.on('connect', () => {
      const targetTemp = 25
      cl.setTemperature(targetTemp, (err, val) => {
        expect(err).have.to.be.equal(null)
        expect(val).have.to.be.equal(25)
        cl.disconnect()
      })
    })
    cl.on('disconnect', () => done())
    cl.on('error', err => console.log(err))
    cl.connect()
  })

  it('change temp with wrong val', function (done) {
    this.timeout(3000)

    const cl = new Client(local.connectionOptions)
    cl.on('connect', () => {
      const targetSpeed = 55
      cl.setTemperature(targetSpeed, (err) => {
        expect(err.message).have.to.be.equal('The target temperature must be between 6 and 44')
        cl.disconnect()
      })
    })
    cl.on('disconnect', () => done())
    cl.on('error', err => console.log(err))
    cl.connect()
  })
})
