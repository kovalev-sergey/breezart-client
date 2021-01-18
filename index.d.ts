
declare module 'breezart-client' {
  import * as events from 'events';
  
  type Nullable<T> = T | null;
  type VoidCallback = (error?: Nullable<Error>) => void;
  type BreezartCallback = (error?: Nullable<Error>, value?: number) => void;

  type BreezartDeviceConfig = {
    name: string;
    host: string;
    port: number;
    password: number;
  };


  const enum BreezartEventTypes {
    CONNECT = "connect",
    ERROR = "error",
    TIMEOUT = "timeout",
    DATA = "data",
    DISCONNECT = "disconnect"
  }

  class BreezartClient extends events.EventEmitter {
    constructor(options: BreezartDeviceConfig);

    // Parameters
    TempMin: number;
    TempMax: number;
    SpeedMin: number;
    SpeedMax: number;
    HumidMin: number;
    HumidMax: number;
    NVAVZone: number;
    VAVMode: number;
    IsRegPressVAV: number;
    IsShowHum: number;
    IsCascRegT: number;
    IsCascRegH: number;
    IsHumid: number;
    IsCooler: number;
    IsAuto: number;
    ProtSubVers: number;
    ProtVers: number;
    LoVerTPD: number;
    HiVerTPD: number;
    Firmware_Ver: number;
    // State
    PwrBtnState: number;
    IsWarnErr: number;
    IsFatalErr: number;
    DangerOverheat: number;
    AutoOff: number;
    ChangeFilter: number;
    ModeSet: number;
    HumidMode: number;
    SpeedIsDown: number;
    FuncRestart: number;
    FuncComfort: number;
    HumidAuto: number;
    ScenBlock: number;
    BtnPwrBlock: number;
    UnitState: number;
    ScenAllow: number;
    Mode: number;
    NumActiveScen: number;
    WhoActivateScen: number;
    NumIcoHF: number;
    Tempr: number;
    TemperTarget: number;
    Humid: number;
    HumidTarget: number;
    Speed: number;
    SpeedTarget: number;
    SpeedFact: number;
    ColorMsg: number;
    ColorInd: number;
    FilterDust: number;
    TimeMinutes: number;
    TimeHours: number;
    TimeDay: number;
    TimeMonth: number;
    TimeDayOfWeek: number;
    TimeYear: number;
    Msg: string;

    // Sensor values
    TInf: Nullable<number>;
    HInf: Nullable<number>;
    TRoom: Nullable<number>;
    HRoom: Nullable<number>;
    TOut: Nullable<number>;
    HOut: Nullable<number>;
    Thf: Nullable<number>;
    Pwr: Nullable<number>;
    
    connected: boolean;

    toString (): string;
    connect(): void;
    disconnect(): void;

    /**
     * Get status variables of instance.
     * @param {VoidCallback} callback
     */
    getStatus(callback: VoidCallback): void;
    /**
     * Get sensor values of instance.
     * @param {VoidCallback} callback
     */
    getSensorValues(callback: VoidCallback): void;
    /**
     * Get status and sensor values of the instance
     * @param {VoidCallback} callback
     */
    getCurrentStatus(callback: VoidCallback): void;
    /**
     * Fan speed change
     * @param {number} targetSpeed Target speed for the fan
     * @param {BreezartCallback} callback
     */
    setFanSpeed(targetSpeed: number, callback: BreezartCallback): void;
    /**
     * Temperature change
     * @param {number} targetTemperature Target temperature
     * @param {BreezartCallback} callback
     */
    setTemperature(targetTemperature: number, callback: BreezartCallback): void;

  }

  export { BreezartClient, BreezartDeviceConfig, BreezartCallback, BreezartEventTypes };
}
