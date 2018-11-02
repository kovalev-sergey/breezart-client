const Telnet = require('telnet-client')
const { decToHex, parceBits } = require('./util/hex')
const queue = require('queue')

const defaultOptions = {
  port: 1560,
  timeout: 0,
  negotiationMandatory: false,
  password: null // Two bytes password. Default is `0x0`
}

const BreezartClient = function (options) {
  if (!(options || {}).ip) {
    throw new Error('IP address not set')
  }
  this.options = Object.assign(defaultOptions, options)
  this.commands = queue()
  this.connection = new Telnet()

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
  this.TempMin = null
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

  this.connection.on('ready', (prompt) => {
    console.log('Connection to Breezart is established')
    // begin processing, get notified on end / failure
    this.commands.autostart = true
    this.commands.start(function (err, results) {
      if (err) throw err
      // TODO: Implement correct error processing
      // console.log('all done:', results)
    })
  })

  this.connection.on('close', () => {
    // console.log('connection closed')
    // stoping processing
    this.commands.autostart = false
    this.commands.stop()
  })

  this.connection.on('timeout', () => {
    console.log('Connection failed: socket timeout')
  })

  // get notified when commands complete
  // this.commands.on('success', function (result, job) {
  //   console.log('job finished processing:', job.toString().replace(/\n/g, ''))
  // })
}

BreezartClient.prototype.toString = function () {
  let obj = Object.assign({}, this)
  delete (obj.commands)
  delete (obj.connection)
  return JSON.stringify(obj)
}

// Known requests for Breezart
BreezartClient.RequestPrefix = {
  STATE: 'VSt07', // Request for state of instance
  ICONS: 'VScIc', // Icons of scenes (for rev.4.XX return `0`)
  SENSORS: 'VSens', // Sensor values (for rev.4.XX return `0xFB07`)
  PROPERTIES: 'VPr07', // Properties of instance
  VAV_01: 'VZL01', // VAV air flow in zone # `1`
  VAV_02: 'VZL02', // VAV air flow in zone # `2`
  VAV_03: 'VZL03', // VAV air flow in zone # `3`
  VAV_04: 'VZL04', // VAV air flow in zone # `4`
  VAV_05: 'VZL05', // VAV air flow in zone # `5`
  VAV_06: 'VZL06', // VAV air flow in zone # `6`
  VAV_07: 'VZL07', // VAV air flow in zone # `7`
  VAV_08: 'VZL08', // VAV air flow in zone # `8`
  VAV_09: 'VZL09', // VAV air flow in zone # `9`
  VAV_10: 'VZL10', // VAV air flow in zone # `10`
  VAV_11: 'VZL11', // VAV air flow in zone # `11`
  VAV_12: 'VZL12', // VAV air flow in zone # `12`
  VAV_13: 'VZL13', // VAV air flow in zone # `13`
  VAV_14: 'VZL14', // VAV air flow in zone # `14`
  VAV_15: 'VZL15', // VAV air flow in zone # `15`
  VAV_16: 'VZL16', // VAV air flow in zone # `16`
  VAV_17: 'VZL17', // VAV air flow in zone # `17`
  VAV_18: 'VZL18', // VAV air flow in zone # `18`
  VAV_19: 'VZL19', // VAV air flow in zone # `19`
  VAV_20: 'VZL20', // VAV air flow in zone # `20`
  SCENE_01: 'VSc01', // Scene # `1`
  SCENE_02: 'VSc02', // Scene # `2`
  SCENE_03: 'VSc03', // Scene # `3`
  SCENE_04: 'VSc04', // Scene # `4`
  SCENE_05: 'VSc05', // Scene # `5`
  SCENE_06: 'VSc06', // Scene # `6`
  SCENE_07: 'VSc07', // Scene # `7`
  SCENE_08: 'VSc08', // Scene # `8`
  CHANGE_POWER: 'VWPwr', // Change instance power
  CHANGE_TEMP: 'VWTmp', // Change instance temperature
  CHANGE_HUMIDY: 'VWHum', // Change instance humidy
  CHANGE_FAN_SPEED: 'VWSpd', //
  CHANGE_VAV_FAN_SPEED: 'VWZon', //
  ACTIVATE_SCENE: 'VWScn', //
  SET_DATE_TIME: 'VWSdt', //
  SET_MODE: 'VWFtr' // Set work mode of instance
}

// Known Errors responses for Breezart
BreezartClient.ErrorPrefix = {
  VEPas: 'Wrong password',
  VEFrm: 'Wrong format of request', //  ошибка формата (слишком длинный или слишком короткий запрос, в запросе длиной более 5 символов нет разделителя «_»), Reqv – полученный запрос
  VECd1: 'Request of type 1 not found',
  VECd2: 'Request of type 2 not found',
  VEDat_E: 'Error in variable',
  VEDat_TM: 'Many variables (more than 17)',
  VEDat_L: 'The value of the variable is less than the minimum allowed',
  VEDat_H: 'The value of the variable is greater than the maximum allowed',
  VECon: 'No connection with the ventilation unit',
  VECJL: 'No connection with the JL module (the remote of VAV)'
}

// Delimiter for request and data fields
BreezartClient.DELIMITER = '_'

BreezartClient.prototype.constructRequest = function (requestType, data) {
  let req = []
  // Construct request as requestType _ password
  req.push(requestType)
  if (this.options.password) req.push(decToHex(this.options.password))
  return req.join(BreezartClient.DELIMITER)
}

BreezartClient.prototype.makeRequest = function (requestType, data, callback) {
  let req = this.constructRequest(requestType, data)
  this.commands.push((cb) => {
    this.connection.send(req, { waitfor: '\r\n' }, (error, response) => {
      // Response like `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
      // split it
      if (error) {
        callback(error, null)
      } else {
        if (!response) {
          callback(new Error(`Illegal response: ${response}`), null)
        } else {
          let parcedResponse = response.split(BreezartClient.DELIMITER)
          callback(error, parcedResponse)
        }
      }
    })
    // TODO: Need error handling
    cb()
  })
}

BreezartClient.prototype.parceResponse = function (error, response) {
  if (error) console.error('Response error:', error)
  console.log('Response:', response)
}

BreezartClient.prototype.connect = function (connectionParams, attempts) {
  // Create connection and start queue requests processing
  const defParams = {
    host: this.options.ip,
    port: this.options.port,
    timeout: this.options.timeout,
    negotiationMandatory: true
  }
  const params = Object.assign(defParams, connectionParams)

  // Calc timeout for next attempt
  attempts = (attempts || 0) < 8 ? (attempts || 0) : 8
  let timeout = 1000 * Math.pow(2, attempts)

  this.connection.once('error', () => {
    this.connection.end()
    setTimeout((t, a) => {
      console.error('Connection failed: Reconnecting after', t / 1000 * 2, 'secons')
      this.connect(connectionParams, attempts)
    }, timeout, timeout, attempts++)
  })

  console.log('Connecting to Breezart...')
  this.connection.connect(params)
}

/**
  Get constant parameters of instance.
  Calling ones after connecting
*/
BreezartClient.prototype.getProperties = function (callback) {
  let requestType = BreezartClient.RequestPrefix.PROPERTIES
  this.makeRequest(requestType, null, (error, response) => {
    if (error) {
      // Properties need for next work
      throw new Error(`Cant get properties of Breezart: ${error.message}`)
    } else {
      // Response is array from `VPr07_bitTempr_bitSpeed_bitHumid_bitMisc_BitPrt_BitVerTPD_BitVerContr`
      if (response[0] !== requestType) {
        throw new Error(`Incorrect response received form Breezart. Must be: ${requestType}, but received: ${response[0]}`)
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

      callback()
    }
  })
}

/**
  Get status variables of instance.
*/
BreezartClient.prototype.getStatus = function (callback) {
  let requestType = BreezartClient.RequestPrefix.STATE
  this.makeRequest(requestType, null, (error, response) => {
    if (error) {
      // Properties need for next work
      throw new Error(`Can't get status of Breezart: ${error.message}`)
    } else {
      // Response is array from `VSt07_bitState_bitMode_bitTempr_bitHumid_bitSpeed_bitMisc_bitTime_bitDate_bitYear_Msg`
      if (response[0] !== requestType) {
        throw new Error(`Incorrect response received form Breezart. Must be ${requestType}, but received: ${response[0]}`)
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

      callback()
    }
  })
}

module.exports = BreezartClient
