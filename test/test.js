const Breezart = require('./index')

let cl = new Breezart({ ip: '127.0.0.1', password: 12321 })

cl.connect()

cl.getProperties(() => {
  console.log(cl.toString())
})

cl.getStatus(() => {
  console.log(cl.toString())
})
