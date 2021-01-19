const readline = require('readline')
const TestServer = require('./server')

const server = new TestServer({ port: 1560, password: 28854 })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.on('SIGINT', () => {
  server.stop()
    .then(() => {
      console.log('Server succefully stoped')
      rl.close()
    })
})

server.start()
  .then(() => {
    console.log('Server started:')
    console.log(`\t Host ${server.host}:${server.port}`)
    console.log(`\t Password ${server.password}`)
    console.log('To stop the server, press Ctrl+Q')
  })
