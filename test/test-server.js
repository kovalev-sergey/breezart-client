const net = require('net')

const propResponse = function () {
  let propResponse = []
  propResponse.push('VPr07')
  propResponse.push('2C06') // TempMin = 6, TempMax = 44 (0010 1100 0000 0110)
  propResponse.push('906') // SpeedMin = 6, SpeedMax = 9 (0000 1001 0000 0110)
  propResponse.push('6301') // HumidMin = 1, HumidMax = 99 (0110 0011 0000 0001)
  propResponse.push('D413') // NVAVZone = 19, reserv[5,7] = 0, VAVMode = 0, IsRegPressVAV = 0, IsShowHum = 1, IsCascRegT = 0, IsCascRegH = 1, IsHumid = 0, IsCooler = 1, IsAuto = 1 (1101 0100 0001 0011)
  propResponse.push('FE02') // ProtSubVers = 2, ProtVers = 254 (1111 1110 0000 0010)
  propResponse.push('FD03') // LoVerTPD = 3, HiVerTPD = 253 (1111 1101 0000 0011)
  propResponse.push('EA60') // Firmware_Ver = 60000 (1110 1010 0110 0000)
  return propResponse.join('_') + '\r\n'
}

const statsResponse = function () {
  let statsResponse = []
  statsResponse.push('VSt07')
  statsResponse.push('841') // bitState (0000 1000 0100 0001)
  statsResponse.push('2015') // bitMode (0010 0000 0001 0101)
  statsResponse.push('1312') // bitTempr (0001 0011 0001 0010)
  statsResponse.push('0') // bitHumid (0000 0000 0000 0000)
  statsResponse.push('6422') // bitSpeed (0110 0100 0010 0010)
  statsResponse.push('85') // bitMisc (0000 0000 1000 0101)
  statsResponse.push('1017') // bitTime (0001 0000 0001 0111)
  statsResponse.push('A1F') // bitDate (0000 1010 0001 1111)
  statsResponse.push('1202') // bitYear (0001 0010 0000 0010)
  statsResponse.push('All OK') // Msg
  return statsResponse.join('_') + '\r\n'
}

const connectionListener = function (socket) {
  console.log('Client connected')
  socket.write('/ #\r\n')
  // socket.pipe(socket)
  socket.on('error', (err) => {
    if (err.code === 'ECONNRESET') return
    throw err
  })
  socket.on('end', () => {
    console.log('Client disconnected')
  })
  socket.on('data', (data) => {
    // socket.write('Receive:\r\n')
    // socket.write(data)
    const buffer = Buffer.from(data)
    const str = buffer.toString()
    console.log('Receive: ', str)

    if (str.split('_')[0] === 'VPr07') {
      console.log('Response: ', propResponse())
      socket.end(propResponse())
      return
    }
    if (str.split('_')[0] === 'VSt07') {
      console.log('Response: ', statsResponse())
      socket.end(statsResponse())
      return
    }

    if (str === '03') {
      // socket.pipe(socket);
      socket.end('Goodbye!\r\n')
    }
  })
}

const server = net.createServer(connectionListener)
server.on('error', (err) => {
  throw err
})

const opt = {
  host: 'localhost',
  port: 1560
}

server.listen(opt, () => {
  console.log('Server bound on', server.address())
})
