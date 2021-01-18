const net = require('net')
const { decToHex, parceBits, hexToDecSign, hexToDec } = require('./util/hex')
const queue = require('queue')
const EventEmitter = require('events')

const CONNECTION_TIMEOUT = 5000

const defaultOptions = {
  port: 1560
}

class BreezartClient extends EventEmitter.EventEmitter {
  constructor (options) {
    super()
    if (!(options || {}).host) {
      throw new Error('Host is not set')
    }
    if (!(options || {}).password) {
      throw new Error('Password is not set')
    }
    this.options = Object.assign(defaultOptions, options)

    // Parameters
    this.TempMin = null
    this.TempMax = null
    this.SpeedMin = null
    this.SpeedMax = null
    this.HumidMin = null
    this.HumidMax = null
    this.NVAVZone = null
    this.VAVMode = null
    this.IsRegPressVAV = null
    this.IsShowHum = null
    this.IsCascRegT = null
    this.IsCascRegH = null
    this.IsHumid = null
    this.IsCooler = null
    this.IsAuto = null
    this.ProtSubVers = null
    this.ProtVers = null
    this.LoVerTPD = null
    this.HiVerTPD = null
    this.Firmware_Ver = null
    // State
    this.PwrBtnState = null
    this.IsWarnErr = null
    this.IsFatalErr = null
    this.DangerOverheat = null
    this.AutoOff = null
    this.ChangeFilter = null
    this.ModeSet = null
    this.HumidMode = null
    this.SpeedIsDown = null
    this.FuncRestart = null
    this.FuncComfort = null
    this.HumidAuto = null
    this.ScenBlock = null
    this.BtnPwrBlock = null
    this.UnitState = null
    this.ScenAllow = null
    this.Mode = null
    this.NumActiveScen = null
    this.WhoActivateScen = null
    this.NumIcoHF = null
    this.Tempr = null
    this.TemperTarget = null
    this.Humid = null
    this.HumidTarget = null
    this.Speed = null
    this.SpeedTarget = null
    this.SpeedFact = null
    this.ColorMsg = null
    this.ColorInd = null
    this.FilterDust = null
    this.TimeMinutes = null
    this.TimeHours = null
    this.TimeDay = null
    this.TimeMonth = null
    this.TimeDayOfWeek = null
    this.TimeYear = null
    this.Msg = null

    // Sensor values
    this.TInf = null
    this.HInf = null
    this.TRoom = null
    this.HRoom = null
    this.TOut = null
    this.HOut = null
    this.Thf = null
    this.Pwr = null

    this.commands = queue({ concurrency: 1 })

    this.commands.on('success', (result) => {
      this.processingResponseResult(null, result)
    })

    this.commands.on('error', (err) => {
      this.processingResponseResult(err, null)
    })

    this.connection = new net.Socket()
    this.connection.setTimeout(CONNECTION_TIMEOUT)

    this.connection.on('connect', () => {
      this.connected = true

      this.commands.autostart = true

      // Read device properties
      this.getProperties(() => {
        this.emit('connect')
      })
    })

    this.connection.on('close', () => {
      // stoping processing
      this.commands.autostart = false
      this.commands.stop()
      this.connected = false
      console.debug('Connection status: socket close')
      this.emit('disconnect')
    })

    this.connection.on('timeout', () => {
      this.connected = false
      console.debug('Connection status: socket timeout')
      this.connection.destroy(error => {
        this.emit('error', error)
      })
      this.disconnect()
    })
  }

  /**
   * Processing the result of the communication with the device.
   * Calls on each command's queue 'success'
   * @param {Error | null} error socket error
   * @param {{request: String; response: String[]; callback: (error?: Error | null, value?: number) => void}} result result of the communication with the device
   */
  processingResponseResult (error, result) {
    if (error) {
      this.emit('error', error)
      return
    }
    const request = result.request
    const response = result.response
    const callback = result.callback
    const responseType = response[0]

    const responseError = this.checkResponse(response)

    if (responseError) {
      callback(responseError)
      return
    }

    let value = null
    switch (responseType) {
      case BreezartClient.ResponseType.PROPERTIES:
        value = this.parseResponseProperties(request, response)
        break
      case BreezartClient.ResponseType.STATE:
        value = this.parseResponseStatus(request, response)
        break
      case BreezartClient.ResponseType.SENSORS:
        value = this.parseResponseSersorValues(request, response)
        break
      case BreezartClient.ResponseType.OK: // All responses to a request to set values
        value = this.parseResponseSetValues(request, response)
        break
      default:
        break
    }
    callback(null, value)
  }

  toString () {
    const obj = Object.assign({}, this)
    delete (obj.commands)
    delete (obj.connection)
    return JSON.stringify(obj)
  }

  constructRequest (requestType, data) {
    const req = []
    // Construct request as requestType _ password
    req.push(requestType)
    req.push(decToHex(this.options.password))
    if (data) {
      req.push(decToHex(data))
    }
    return req.join(BreezartClient.DELIMITER)
  }

  /**
   * Split device message to the array
   * @param {String} message
   * @returns {String[]}
   */
  splitMessage (message) {
    // Split and fix bug(?) when response has two delimiters with no values, Like `VSens__e6_fb07_fb07_fb07_fb07_fb07_fb07_0`
    const splittedMessage = message.split(BreezartClient.DELIMITER).filter((v) => { return !!v })
    return splittedMessage
  }

  /**
   * Make a request by constructing it, creating a job, and placing it in the queue.
   * Response of that request should be catched in the queue notification about job results
   * @param {BreezartClient.RequestType} requestType
   * @param {*} data
   * @param {(error?: Error | null, value?: number) => void} callback
   */
  makeRequest (requestType, data, callback) {
    const req = this.constructRequest(requestType, data)
    this.commands.push((cb) => {
      // console.debug(`Send ${req}`)
      this.send(req, (error, response) => {
        // Response like `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
        // split it
        if (error) {
          cb(error, null)
        } else {
          if (!response) {
            cb(new Error(`Illegal response: ${response}`), null)
          } else {
            // console.debug(`Receive ${response}`)
            // Split and fix bug(?) when response has two delimiters with no values. Like `VSens__e6_fb07_fb07_fb07_fb07_fb07_fb07_0`
            const parcedResponse = this.splitMessage(response)
            const result = {
              request: req,
              response: parcedResponse,
              callback: callback
            }
            cb(null, result)
          }
        }
      })
      // TODO: Need error handling
    })
  }

  send (req, cb) {
    this.connection.write(req, () => {
      let response = ''
      this.connection.on('data', sendHandler)
      const timeout = setTimeout(() => {
        if (response === '') {
          this.connection.removeListener('data', sendHandler)
          this.emit('timeout')
          cb(new Error(`Response for ${req} not received`))
        }
      }, 3000)

      const self = this.connection
      const that = this
      function sendHandler (data) {
        response = data.toString()
        that.emit('data', response)
        self.removeListener('data', sendHandler)
        clearTimeout(timeout)
        cb(null, response)
      }
    })
  }

  connect (connectionParams, attempts) {
    // Create connection and start queue requests processing
    const defParams = {
      host: this.options.host,
      port: this.options.port
    }
    const params = Object.assign(defParams, connectionParams)
    // Calc timeout for next attempt
    attempts = (attempts || 0) < 8 ? (attempts || 0) : 8
    const timeout = 1000 * Math.pow(2, attempts)
    this.connection.once('error', () => {
      this.connection.end()
      setTimeout((t, a) => {
        this.emit('error', new Error(`Connection failed: Reconnecting after ${t / 1000} seconds`))
        this.connect(connectionParams, attempts)
      }, timeout, timeout, attempts++)
    })
    console.debug('Connecting to Breezart...', params.host, params.port)
    this.connection.connect(params)
  }

  disconnect () {
    this.commands.autostart = false
    this.commands.stop()
    this.connection.end()
    this.connected = false
  }

  /**
   * Check response for error returned by instance
   * @param {String[]} response
   * @returns {Error | null} if has error
   */
  checkResponse (response) {
    if (response[0] in BreezartClient.ErrorPrefix) {
      const error = new Error(`${BreezartClient.ErrorPrefix[response[0]]}, ${response.join(BreezartClient.DELIMITER)}`)
      this.emit('error', error)
      return error
    }
    return null
    // TODO: add checks of other responses (`BreezartClient.ResponseTypes`) and emit an error if the prefix is not found
  }

  /**
    Get constant parameters of instance.
    Calling ones after connecting
    @param {(error?: Error | null) => void} callback
  */
  getProperties (callback) {
    const requestType = BreezartClient.RequestType.GET_PROPERTIES
    this.makeRequest(requestType, null, callback)
  }

  parseResponseProperties (request, response) {
    // The response is an array from `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
    const responseType = BreezartClient.ResponseType.PROPERTIES
    if (response[0] !== responseType) {
      throw new Error(`Incorrect response received from Breezart. Must be: ${responseType}, but received: ${response[0]}`)
    }
    // bitTempr
    // Bit 7-0 – TempMin – минимально допустимая заданная температура (от 5 до 15)
    // Bit 15-8 – TempMax – максимально допустимая заданная температура (от 30 до 45)
    this.TempMin = parceBits(response[1], 0, 7)
    this.TempMax = parceBits(response[1], 8, 15)
    // bitSpeed
    // Bit 7-0 – SpeedMin - минимальная скорость (от 1 до 7)
    // Bit 15-8 – SpeedMax - максимальная скорость (от 2 до 10)
    this.SpeedMin = parceBits(response[2], 0, 7)
    this.SpeedMax = parceBits(response[2], 8, 15)
    // bitHumid
    // Bit 7-0 – HumidMin – минимальная заданная влажность, от 0 до 100%
    // Bit 15-8 – HumidMax - максимальная заданная влажность, от 0 до 100%
    this.HumidMin = parceBits(response[3], 0, 7)
    this.HumidMax = parceBits(response[3], 8, 15)
    // bitMisc
    // Bit 4 - 0 – NVAVZone – кол-во зон в режиме VAV (от 1 до 20).
    // Bit 7 - 5 – резерв
    // Bit 8 – VAVMode – режим VAV включен.
    // Bit 9 – IsRegPressVAV – включена возможность регулирования давления в канале в режиме VAV.
    // Bit 10 – IsShowHum – включено отображение влажности.
    // Bit 11 – IsCascRegT – включен каскадный регулятор T.
    // Bit 12 – IsCascRegH – включен каскадный регулятор H.
    // Bit 13 – IsHumid – есть увлажнитель.
    // Bit 14 – IsCooler – есть охладитель.
    // Bit 15 – IsAuto – есть режим Авто переключения Обогрев / Охлаждение.
    this.NVAVZone = parceBits(response[4], 0, 4)
    this.VAVMode = parceBits(response[4], 8)
    this.IsRegPressVAV = parceBits(response[4], 9)
    this.IsShowHum = parceBits(response[4], 10)
    this.IsCascRegT = parceBits(response[4], 11)
    this.IsCascRegH = parceBits(response[4], 12)
    this.IsHumid = parceBits(response[4], 13)
    this.IsCooler = parceBits(response[4], 14)
    this.IsAuto = parceBits(response[4], 15)
    // BitPrt
    // Bit 7-0 – ProtSubVers – субверсия протокола обмена (от 1 до 255)
    // Bit 15-8 – ProtVers – версия протокола обмена (от 100 до 255)
    this.ProtSubVers = parceBits(response[5], 0, 7)
    this.ProtVers = parceBits(response[5], 8, 15)
    // BitVerTPD
    // Bit 7-0 – LoVerTPD – младший байт версии прошивки пульта
    // Bit 15-8 – HiVerTPD – старший байт версии прошивки пульта
    this.LoVerTPD = parceBits(response[6], 0, 7)
    this.HiVerTPD = parceBits(response[6], 8, 15)
    // BitVerContr
    this.Firmware_Ver = parceBits(response[7], 0, 15)
    return null
  }

  /**
    Get status variables of instance.
    @param {(error?: Error | null) => void} callback
  */
  getStatus (callback) {
    const requestType = BreezartClient.RequestType.GET_STATE
    this.makeRequest(requestType, null, callback)
  }

  parseResponseStatus (request, response) {
    // The response is an array from `VSt07_bitState_bitMode_bitTempr_bitHumid_bitSpeed_bitMisc_bitTime_bitDate_bitYear_Msg`
    const responseType = BreezartClient.ResponseType.STATE
    if (response[0] !== responseType) {
      throw new Error(`Incorrect response received form Breezart. Must be ${responseType}, but received: ${response[0]}`)
    }
    // bitState
    // Bit 0 – PwrBtnState – состояние кнопки питания (вкл / выкл).
    // Bit 1 – IsWarnErr – есть предупреждение. В Msg содержится текст сообщения.
    // Bit 2 – IsFatalErr – есть критическая ошибка. В Msg содержится текст сообщения.
    // Bit 3 – DangerOverheat – угроза перегрева калорифера (для установки с электрокалорифером).
    // Bit 4 – AutoOff – установка автоматически выключена на 5 минут для автоподстройки нуля
    // датчика давления.
    // Bit 5 – ChangeFilter – предупреждение о необходимости замены фильтра.
    // Bit 8-6 – ModeSet – установленный режим работы.
    // 1 – Обогрев
    // 2 – Охлаждение
    // 3 – Авто
    // 4 – Отключено (вентиляция без обогрева и охлаждения)
    // Bit 9 – HumidMode – селектор Увлажнитель активен (стоит галочка).
    // Bit 10 – SpeedIsDown – скорость вентилятора автоматически снижена.
    // Bit 11 – FuncRestart – включена функция Рестарт при сбое питания.
    // Bit 12 – FuncComfort – включена функция Комфорт.
    // Bit 13 – HumidAuto – увлажнение включено (в режиме Авто).
    // Bit 14 – ScenBlock – сценарии заблокированы режимом ДУ.
    // Bit 15 – BtnPwrBlock – кнопка питания заблокирована режимом ДУ
    this.PwrBtnState = parceBits(response[1], 0)
    this.IsWarnErr = parceBits(response[1], 1)
    this.IsFatalErr = parceBits(response[1], 2)
    this.DangerOverheat = parceBits(response[1], 3)
    this.AutoOff = parceBits(response[1], 4)
    this.ChangeFilter = parceBits(response[1], 5)
    this.ModeSet = parceBits(response[1], 6, 8)
    this.HumidMode = parceBits(response[1], 9)
    this.SpeedIsDown = parceBits(response[1], 10)
    this.FuncRestart = parceBits(response[1], 11)
    this.FuncComfort = parceBits(response[1], 12)
    this.HumidAuto = parceBits(response[1], 13)
    this.ScenBlock = parceBits(response[1], 14)
    this.BtnPwrBlock = parceBits(response[1], 15)
    // bitMode:
    // Bit 1-0 – UnitState – состояние установки:
    //    0 – Выключено.
    //    1 – Включено.
    //    2 – Выключение (переходный процесс перед отключением).
    //    3 – Включение (переходный процесс перед включением).
    // Bit 2 – ScenAllow – разрешена работа по сценариям.
    // Bit 5-3 – Mode – режим работы:
    //    0 – Обогрев
    //    1 – Охлаждение
    //    2 – Авто-Обогрев
    //    3 – Авто-Охлаждение
    //    4 – Отключено (вентиляция без обогрева и охлаждения)
    //    5 – Нет (установка выключена)
    // Bit 9-6 – NumActiveScen – номер активного сценария (от 1 до 8), 0 если нет.
    // Bit 12-10 – WhoActivateScen – кто запустил (активировал) сценарий:
    //    0 – активного сценария нет и запущен не будет
    //    1 – таймер1
    //    2 – таймер2
    //    3 – пользователь вручную
    //    4 – сценарий будет запущен позднее (сейчас активного сценария нет)
    // Bit 13-15 – NumIcoHF – номер иконки Влажность / фильтр.
    this.UnitState = parceBits(response[2], 0, 1)
    this.ScenAllow = parceBits(response[2], 2)
    this.Mode = parceBits(response[2], 3, 5)
    this.NumActiveScen = parceBits(response[2], 6, 9)
    this.WhoActivateScen = parceBits(response[2], 10, 12)
    this.NumIcoHF = parceBits(response[2], 13, 15)
    // bitTempr:
    // Bit 7-0 – Tempr signed char – текущая температура, °С. Диапазон значений от -50 до 70.
    // Bit 15-8 – TemperTarget – заданная температура, °С. Диапазон значений от 0 до 50.
    this.Tempr = parceBits(response[3], 0, 7) // TODO: Make signed parser
    this.TemperTarget = parceBits(response[3], 8, 15)
    // bitHumid:
    // Bit 7-0 – Humid – текущая влажность (при наличии увлажнители или датчика влажности). Диапазон
    // значений от 0 до 100. При отсутствии данных значение равно 255.
    // Bit 15-8 – HumidTarget – заданная влажность. Диапазон значений от 0 до 100.
    this.Humid = parceBits(response[4], 0, 7)
    this.HumidTarget = parceBits(response[4], 8, 15)
    // bitSpeed:
    // Bit 3-0 – Speed – текущая скорость вентилятора, диапазон от 0 до 10.
    // Bit 7-4 – SpeedTarget – заданная скорость вентилятора, диапазон от 0 до 10.
    // Bit 15-8 – SpeedFact – фактическая скорость вентилятора 0 – 100%. Если не определено, то 255.
    this.Speed = parceBits(response[5], 0, 3)
    this.SpeedTarget = parceBits(response[5], 4, 7)
    this.SpeedFact = parceBits(response[5], 8, 15)
    // bitMisc:
    // Bit 3-0 – TempMin – минимально допустимая заданная температура (от 5 до 15). Может изменяться
    // в зависимости от режима работы вентустановки
    // Bit 5, 4 – ColorMsg – иконка сообщения Msg для различных состояний установки:
    //    0 – Нормальная работа (серый)
    //    1 – Предупреждение (желтый)
    //    2 – Ошибка (красный)
    //  Bit 7, 6 – ColorInd – цвет индикатора на кнопке питания для различных состояний установки:
    //    0 – Выключено (серый)
    //    1 – Переходный процесс включения / отключения (желтый)
    //    2 – Включено (зеленый)
    // Bit 15-8 – FilterDust – загрязненность фильтра 0 - 250%, если не определено, то 255.
    this.TempMin = parceBits(response[6], 0, 3)
    this.ColorMsg = parceBits(response[6], 4, 5)
    this.ColorInd = parceBits(response[6], 6, 7)
    this.FilterDust = parceBits(response[6], 8, 15)
    // bitTime:
    // Bit 7-0 – nn – минуты (от 00 до 59)
    // Bit 15-8 – hh – часы (от 00 до 23)
    this.TimeMinutes = parceBits(response[7], 0, 7)
    this.TimeHours = parceBits(response[7], 8, 15)
    // bitDate:
    // Bit 7-0 – dd – день месяца (от 1 до 31)
    // Bit 15-8 – mm – месяц (от 1 до 12)
    this.TimeDay = parceBits(response[8], 0, 7)
    this.TimeMonth = parceBits(response[8], 8, 15)
    // bitYear:
    // Bit 7-0 – dow – день недели (от 1-Пн до 7-Вс)
    // Bit 15-8 – yy – год (от 0 до 99, последние две цифры года).
    this.TimeDayOfWeek = parceBits(response[9], 0, 7)
    this.TimeYear = parceBits(response[9], 8, 15)
    // Msg - текстовое сообщение о состоянии установки длиной от 5 до 70 символов
    this.Msg = response[10]
    return null
  }

  /**
    Get sensor values of instance.
    @param {(error?: Error | null) => void} callback
  */
  getSensorValues (callback) {
    const requestType = BreezartClient.RequestType.GET_SENSORS
    this.makeRequest(requestType, null, callback)
  }

  parseResponseSersorValues (request, response) {
    // The response is an array from `VSens_TInf_HInf_TRoom_HRoom_TOut_HOut_THF_Pwr`
    const responseType = BreezartClient.ResponseType.SENSORS
    if (response[0] !== responseType) {
      throw new Error(`Incorrect response received form Breezart. Must be ${responseType}, but received: ${response[0]}`)
    }
    // TInf signed word – температура воздуха на выходе вентустановки х 10, °С.
    // Диапазон значений от -50,0 до 70,0. При отсутствии корректных данных значение равно 0xFB07
    // HInf – влажность воздуха на выходе вентустановки x 10. Диапазон значений от 0,0 до 100,0. При отсутствии корректных данных значение равно 0xFB07.
    // TRoom, HRoom – температура и влажность воздуха в помещении
    // TOut, HOut – температура и влажность наружного воздуха.
    // THF – температура теплоносителя.
    // Pwr – потребляемая калорифером мощность, Вт (от 0 до 65500).
    this.TInf = response[1] === 'fb07' ? null : hexToDecSign(response[1]) / 10.0
    this.HInf = response[2] === 'fb07' ? null : hexToDec(response[2]) / 10.0
    this.TRoom = response[3] === 'fb07' ? null : hexToDec(response[3])
    this.HRoom = response[4] === 'fb07' ? null : hexToDec(response[4])
    this.TOut = response[5] === 'fb07' ? null : hexToDec(response[5])
    this.HOut = response[6] === 'fb07' ? null : hexToDec(response[6])
    this.Thf = response[7] === 'fb07' ? null : hexToDec(response[7])
    this.Pwr = response[8] === 'fb07' ? null : hexToDec(response[8])

    return null
  }

  /**
   * Get status and sensor values of the instance
   * @param {(error?: Error | null, value?: number) => void} callback
   */
  getCurrentStatus (callback) {
    this.getStatus((error) => {
      if (error) {
        callback(error, null)
      } else {
        this.getSensorValues((error) => {
          callback(error, null)
        })
      }
    })
  }

  /**
   * Turn on/off the device
   * @param {BreezartClient.DataValues} power
   * @param {(error?: Error | null, value?: number) => void} callback
   */
  setPower (power, callback) {
    // set power only after status are known
    this.getStatus((error) => {
      if (error) {
        callback(error)
      } else if (power && (this.UnitState === 1 || this.UnitState === 3)) {
        callback(null)
      } else if (!power && (this.UnitState === 0 || this.UnitState === 2)) {
        callback(null)
      } else {
        const requestType = BreezartClient.RequestType.SET_POWER
        const data = BreezartClient.DataValues.POWER_ON
        this.makeRequest(requestType, data, callback)
      }
    })
  }

  /**
   * Fan speed change
   * @param {number} targetSpeed Target speed for the fan
   * @param {(error?: Error | null, value?: number) => void} callback
   */
  setFanSpeed (targetSpeed, callback) {
    if (!Number.isInteger(targetSpeed)) {
      callback(new Error('targetSpeed must be an integer'), null)
    }
    if (this.VAVMode || (this.IsRegPressVAV && this.IsRegPressVAV !== 1)) {
      callback(new Error('VAVMode found. The fan speed can\'t be changed in VAV modes'), null)
    } else if (targetSpeed > this.SpeedMax || targetSpeed < this.SpeedMin) {
      callback(new Error(`The target speed must be between ${this.SpeedMin} and ${this.SpeedMax}`), null)
    } else if (targetSpeed === this.SpeedTarget) {
      callback(null, targetSpeed)
    } else {
      const requestType = BreezartClient.RequestType.SET_FAN_SPEED
      const data = targetSpeed
      this.makeRequest(requestType, data, callback)
    }
  }

  /**
   * Target temperature change
   * @param {number} targetTemperature Target temperature
   * @param {(error?: Error | null, value?: number) => void} callback
   */
  setTemperature (targetTemperature, callback) {
    if (!Number.isInteger(targetTemperature)) {
      callback(new Error('targetTemperature must be an integer'), null)
    }
    if (targetTemperature > this.TempMax || targetTemperature < this.TempMin) {
      callback(new Error(`The target temperature must be between ${this.TempMin} and ${this.TempMax}`), null)
    } else if (targetTemperature === this.TemperTarget) {
      callback(null, targetTemperature)
    } else {
      const requestType = BreezartClient.RequestType.SET_TEMP
      const data = targetTemperature
      this.makeRequest(requestType, data, callback)
    }
  }

  parseResponseSetValues (request, response) {
    const req = this.splitMessage(request)
    if (response[0] !== BreezartClient.ResponseType.OK) {
      throw new Error(`Incorrect response received form Breezart. Must be OK, but received: ${response[0]}`)
    }
    if (req[0] !== response[1]) {
      throw new Error(`Incorrect response received form Breezart. For the request ${request} was received: ${response}`)
    }
    // try convert response array to number array
    const responseData = response.slice(2)
    const data = []
    for (let index = 0; index < responseData.length; index++) {
      const parsed = hexToDec(responseData[index])
      if (isNaN(parsed)) {
        this.emit('error', new Error(`Incorrect response received. Can't convert to number. Response data: ${response}`))
        return null
      } else {
        data.push(parsed)
      }
    }
    if (data.lenght > 1) {
      return data
    } else {
      return data[0]
    }
  }
}

// Known requests for Breezart
BreezartClient.RequestType = {
  GET_STATE: 'VSt07', // Request for state of instance
  GET_ICONS: 'VScIc', // Icons of scenes (for rev.4.XX return `0`)
  GET_SENSORS: 'VSens', // Sensor values (for rev.4.XX return `0xFB07`)
  GET_PROPERTIES: 'VPr07', // Properties of instance
  GET_VAV_01: 'VZL01', // VAV air flow in zone # `1`
  GET_VAV_02: 'VZL02', // VAV air flow in zone # `2`
  GET_VAV_03: 'VZL03', // VAV air flow in zone # `3`
  GET_VAV_04: 'VZL04', // VAV air flow in zone # `4`
  GET_VAV_05: 'VZL05', // VAV air flow in zone # `5`
  GET_VAV_06: 'VZL06', // VAV air flow in zone # `6`
  GET_VAV_07: 'VZL07', // VAV air flow in zone # `7`
  GET_VAV_08: 'VZL08', // VAV air flow in zone # `8`
  GET_VAV_09: 'VZL09', // VAV air flow in zone # `9`
  GET_VAV_10: 'VZL10', // VAV air flow in zone # `10`
  GET_VAV_11: 'VZL11', // VAV air flow in zone # `11`
  GET_VAV_12: 'VZL12', // VAV air flow in zone # `12`
  GET_VAV_13: 'VZL13', // VAV air flow in zone # `13`
  GET_VAV_14: 'VZL14', // VAV air flow in zone # `14`
  GET_VAV_15: 'VZL15', // VAV air flow in zone # `15`
  GET_VAV_16: 'VZL16', // VAV air flow in zone # `16`
  GET_VAV_17: 'VZL17', // VAV air flow in zone # `17`
  GET_VAV_18: 'VZL18', // VAV air flow in zone # `18`
  GET_VAV_19: 'VZL19', // VAV air flow in zone # `19`
  GET_VAV_20: 'VZL20', // VAV air flow in zone # `20`
  GET_SCENE_01: 'VSc01', // Scene # `1`
  GET_SCENE_02: 'VSc02', // Scene # `2`
  GET_SCENE_03: 'VSc03', // Scene # `3`
  GET_SCENE_04: 'VSc04', // Scene # `4`
  GET_SCENE_05: 'VSc05', // Scene # `5`
  GET_SCENE_06: 'VSc06', // Scene # `6`
  GET_SCENE_07: 'VSc07', // Scene # `7`
  GET_SCENE_08: 'VSc08', // Scene # `8`
  SET_POWER: 'VWPwr', // Change instance power
  SET_TEMP: 'VWTmp', // Change instance temperature
  SET_HUMIDY: 'VWHum', // Change instance humidy
  SET_FAN_SPEED: 'VWSpd', //
  SET_VAV_FAN_SPEED: 'VWZon', //
  SET_SCENE: 'VWScn', //
  SET_DATE_TIME: 'VWSdt', //
  SET_MODE: 'VWFtr' // Set work mode of instance
}

BreezartClient.ResponseType = {
  STATE: BreezartClient.RequestType.GET_STATE,
  ICONS: BreezartClient.RequestType.GET_ICONS,
  SENSORS: BreezartClient.RequestType.GET_SENSORS,
  PROPERTIES: BreezartClient.RequestType.GET_PROPERTIES,
  VAV_01: BreezartClient.RequestType.GET_VAV_01,
  VAV_02: BreezartClient.RequestType.GET_VAV_02,
  VAV_03: BreezartClient.RequestType.GET_VAV_03,
  VAV_04: BreezartClient.RequestType.GET_VAV_04,
  VAV_05: BreezartClient.RequestType.GET_VAV_05,
  VAV_06: BreezartClient.RequestType.GET_VAV_06,
  VAV_07: BreezartClient.RequestType.GET_VAV_07,
  VAV_08: BreezartClient.RequestType.GET_VAV_08,
  VAV_09: BreezartClient.RequestType.GET_VAV_09,
  VAV_10: BreezartClient.RequestType.GET_VAV_10,
  VAV_11: BreezartClient.RequestType.GET_VAV_11,
  VAV_12: BreezartClient.RequestType.GET_VAV_12,
  VAV_13: BreezartClient.RequestType.GET_VAV_13,
  VAV_14: BreezartClient.RequestType.GET_VAV_14,
  VAV_15: BreezartClient.RequestType.GET_VAV_15,
  VAV_16: BreezartClient.RequestType.GET_VAV_16,
  VAV_17: BreezartClient.RequestType.GET_VAV_17,
  VAV_18: BreezartClient.RequestType.GET_VAV_18,
  VAV_19: BreezartClient.RequestType.GET_VAV_19,
  VAV_20: BreezartClient.RequestType.GET_VAV_20,
  SCENE_01: BreezartClient.RequestType.GET_SCENE_01,
  SCENE_02: BreezartClient.RequestType.GET_SCENE_02,
  SCENE_03: BreezartClient.RequestType.GET_SCENE_03,
  SCENE_04: BreezartClient.RequestType.GET_SCENE_04,
  SCENE_05: BreezartClient.RequestType.GET_SCENE_05,
  SCENE_06: BreezartClient.RequestType.GET_SCENE_06,
  SCENE_07: BreezartClient.RequestType.GET_SCENE_07,
  SCENE_08: BreezartClient.RequestType.GET_SCENE_08,
  OK: 'OK' // Response to a request to set values
}

// Known Errors responses for Breezart
BreezartClient.ErrorPrefix = {
  VEPas: 'Wrong password',
  VEFrm: 'Wrong format of request', //  ошибка формата (слишком длинный или слишком короткий запрос, в запросе длиной более 5 символов нет разделителя «_»), Reqv – полученный запрос
  VECd1: 'Request of type 1 not found',
  VECd2: 'Request of type 2 not found',
  VEDat: 'Error in request data',
  VEDat_E: 'Error in variable', // TODO: handle it
  VEDat_TM: 'Many variables (more than 17)', // TODO: handle it
  VEDat_L: 'The value of the variable is less than the minimum allowed', // TODO: handle it
  VEDat_H: 'The value of the variable is greater than the maximum allowed', // TODO: handle it
  VECon: 'No connection with the ventilation unit',
  VECJL: 'No connection with the JL module (the remote of VAV)'
}

// Data values for shange requests
BreezartClient.DataValues = {
  POWER_ON: 1,
  POWER_OFF: 2
}

// Delimiter for request and data fields
BreezartClient.DELIMITER = '_'

function breezartClient (options) {
  return new BreezartClient(options)
}

breezartClient.BreezartClient = BreezartClient

// Allows for { fastify }
breezartClient.breezartClient = breezartClient
// Allows for strict ES Module support
breezartClient.default = breezartClient
// Sets the default export
module.exports = breezartClient
// module.exports = { BreezartClient }
// module.exports.default = BreezartClient
