const Breezart = require('../index')

let cl = new Breezart({ ip: '172.18.36.29', password: 59513 })

cl.connect()

// cl.getProperties(() => {
//   // console.log(cl.toString())
// })

// cl.getStatus(() => {
//   // console.log(cl.toString())
// })

// cl.getSersorValues(() => {
//   console.log(cl.toString())

//   console.log('Unit state', cl.UnitState)
//   console.log('PwrBtnState state', cl.PwrBtnState)

//   // cl.disconnect()
// })
// cl.getStatus(() => {
  console.log('Unit state', cl.UnitState)
  console.log('PwrBtnState state', cl.PwrBtnState)
  cl.setPower(true, () => {
    cl.getStatus(() => {
      console.log('Unit state', cl.UnitState)
      console.log('PwrBtnState state', cl.PwrBtnState)
      cl.disconnect()
    })
  })
// })

