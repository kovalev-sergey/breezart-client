# breezart-client

This module exports a class BreezartClient that implements remote control [Brezzart](http://breezart.ru/) Vents.

This module implement a tcp/ip remote control of Brezzart Vents which has controllers like **JL204С5M**, **JL205**, **JL206** and remotes **TPD-283U** or **TPD-283U-H**.

**Attention**: Remotes must have firmware version `7.05`

For remote control using this module you must be able  to connect the Breezart remote **TPD-283U-H** to LAN, activate the remote control in it and set the password.

> **Disclaimer**\
> Work in progress. New features will be implemented ASAP.

## Example
### Get current status
```js
const BreezartClient = require('../index')

let breezart = new BreezartClient({ host: '192.168.0.20', password: 12345 })

breezart.on('connect', () => {
  breezart.getCurrentStatus((error) => {
    console.log(cl.toString())
    breezart.disconnect()
  })
})

breezart.connect()
```
### Set fan speed
```js
const BreezartClient = require('../index')

let breezart = new BreezartClient({ host: '192.168.0.20', password: 12345 })

breezart.on('connect', () => {
  breezart.setFanSpeed(5, (err, val) => {
    console.log(val)
    breezart.disconnect()
  })
})

breezart.connect()
```
## Install
`npm install breezart-client`

## Test
`npm test`

## API
```js
let breezart = new BreezartClient([opts])
```
`opts` must contain inital values for:
* `host` - host name or ip address
* `password` - password of the Brezzart Vent
* `port` - not neccessary. Default: 1560

## Properties
Properties include eponymous properties described in the device [manual](http://breezart.ru/tech/breezart_smart_home_2019.pdf) (rus)

## Events
`connect` - Emitted when a connection is successfully established.\
`error` - Emitted when an error occurs.  \
`timeout` - Emitted if a response has not been received within 3 seconds. This is only to notify. \
`data` - Emitted when data is received. \
`disconnect` - Emitted when a connection is disconnected.

## License
Copyright © 2018 Sergey Kovalev https://github.com/kovalev-sergey

This work is free. You can redistribute it and/or modify it under the terms of the [MIT License](https://opensource.org/licenses/MIT).\
See LICENSE for full details.
