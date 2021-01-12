const BreezartClient = require('../index')

let cl = new BreezartClient({ host: '172.18.36.23', password: 28854 })

cl.on('connect', () => {
  cl.getCurrentStatus(() => {
    console.log(cl.toString())
    cl.disconnect()
  })
})

cl.connect()

// cl.getProperties(() => {
//   console.log(cl.toString())
// })

// cl.getStatus(() => {
//   console.log(cl.toString())
//   cl.disconnect()
// })

// cl.getSersorValues(() => {
//   console.log(cl.toString())

//   console.log('Unit state', cl.UnitState)
//   console.log('PwrBtnState state', cl.PwrBtnState)

//   // cl.disconnect()
// })
// cl.getStatus(() => {
//   console.log('Unit state', cl.UnitState)
//   console.log('PwrBtnState state', cl.PwrBtnState)
//   cl.setPower(true, () => {
//     cl.getStatus(() => {
//       console.log('Unit state', cl.UnitState)
//       console.log('PwrBtnState state', cl.PwrBtnState)
//       cl.disconnect()
//     })
//   })
// })
