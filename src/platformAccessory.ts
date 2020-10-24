import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';
var request = require("request")
import { ExampleHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ToshibaIRAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private States = {
    Active: this.platform.Characteristic.Active.INACTIVE,
    CurrentHeaterCoolerState: this.platform.Characteristic.CurrentHeaterCoolerState.INACTIVE,
    TargetHeaterCoolerState: this.platform.Characteristic.TargetHeaterCoolerState.AUTO,
    CurrentTemperature: 0,
    CoolingThresholdTemperature: 22,
    HeatingThresholdTemperature: 30,
    Temperature: 20,
  };

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Toshiba Air Conditioner')
      .setCharacteristic(this.platform.Characteristic.Model, 'Main')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '001');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.HeaterCooler) || this.accessory.addService(this.platform.Service.HeaterCooler);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Active)
      .on('get', this.handleActiveGet.bind(this))
      .on('set', this.handleActiveSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState)
      .on('get', this.handleCurrentHeaterCoolerStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState)
      .on('get', this.handleTargetHeaterCoolerStateGet.bind(this))
      .on('set', this.handleTargetHeaterCoolerStateSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CoolingThresholdTemperature)
      .on('get', this.handleCoolingThresholdTemperatureGet.bind(this))
      .on('set', this.handleCoolingThresholdTemperatureSet.bind(this))
      .setProps({ minValue: 17, maxValue: 25, minStep: 1 });

    this.service.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature)
      .on('get', this.handleHeatingThresholdTemperatureGet.bind(this))
      .on('set', this.handleHeatingThresholdTemperatureSet.bind(this))
      .setProps({ minValue: 22, maxValue: 30, minStep: 1 });

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .on('get', this.handleCurrentTemperatureGet.bind(this));


    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    let motionDetected = false;
    setInterval(() => {

    }, 10000);
  }

  //------------------------------------------------------------------------//

  state_to_name(type, state) {
    if (state === this.platform.Characteristic.TargetHeaterCoolerState.HEAT && type === "TargetHeaterCoolerState") { return "HEAT" }
    if (state === this.platform.Characteristic.TargetHeaterCoolerState.COOL && type === "TargetHeaterCoolerState") { return "COOL" }
    if (state === this.platform.Characteristic.TargetHeaterCoolerState.AUTO && type === "TargetHeaterCoolerState") { return "AUTO" }
    if (state === this.platform.Characteristic.Active.INACTIVE && type === "Active") { return "INACTIVE" }
    if (state === this.platform.Characteristic.Active.ACTIVE && type === "Active") { return "ACTIVE" }
  }

  send_message(active, state) {
    let modes = { COOL: 1, DRY: 2, HEAT: 3, FAN: 4, AUTO: 5, ON: true, OFF: false, FAN_AUTO: 0, FAN_MIN: 1, FAN_MID: 2, FAN_MAX: 3, };

    let power, mode, temp, fan
    if (active === this.platform.Characteristic.Active.INACTIVE) {
      power = modes.OFF
    }
    if (active === this.platform.Characteristic.Active.ACTIVE) {
      power = modes.ON
    }
    if (state === this.platform.Characteristic.TargetHeaterCoolerState.HEAT) {
      mode = modes.HEAT
      temp = this.States.HeatingThresholdTemperature
    }
    if (state === this.platform.Characteristic.TargetHeaterCoolerState.COOL) {
      mode = modes.COOL
      temp = this.States.CoolingThresholdTemperature
    }
    fan = modes.FAN_MIN

    if (power !== undefined && mode !== undefined && temp !== undefined) {
      this.platform.log.info("Send: mode=" + mode + ", power=" + power + ", temp=" + temp + ", fan=" + fan)
      request.put({
        url: "http://192.168.88.152/state",
        headers: { "Accept": "application/json; charset=UTF-8", "Content-Type": "application/json", },
        json: { mode, fan, temp, power }
      })
    }

  }

  //------------------------------------------------------------------------//
  handleActiveGet(callback) {
    //this.platform.log.info('Triggered GET Active: ', this.States.Active);
    callback(null, this.States.Active);
  }

  handleActiveSet(value, callback) {
    if (value !== this.States.Active) {
      this.platform.log.info('Change Active:',
        this.state_to_name("Active", this.States.Active),
        "->",
        this.state_to_name("Active", value));
      this.States.Active = value;
      this.send_message(this.States.Active, this.States.TargetHeaterCoolerState)
    }
    callback(null);
  }

  //------------------------------------------------------------------------//
  handleCurrentHeaterCoolerStateGet(callback) {
    //this.platform.log.info('Triggered GET CurrentHeaterCoolerState', this.States.CurrentHeaterCoolerState);
    callback(null, this.States.CurrentHeaterCoolerState);
  }

  //------------------------------------------------------------------------//
  handleTargetHeaterCoolerStateGet(callback) {
    //this.platform.log.info('Triggered GET TargetHeaterCoolerState: ', this.States.TargetHeaterCoolerState);
    callback(null, this.States.TargetHeaterCoolerState);
  }

  handleTargetHeaterCoolerStateSet(value, callback) {
    if (value !== this.States.TargetHeaterCoolerState) {
      this.platform.log.info('Change TargetHeaterCoolerState: ',
        this.state_to_name("TargetHeaterCoolerState", this.States.TargetHeaterCoolerState),
        "->",
        this.state_to_name("TargetHeaterCoolerState", value));
      this.States.TargetHeaterCoolerState = value;
      this.States.CurrentHeaterCoolerState = value;
      this.send_message(this.States.Active, this.States.TargetHeaterCoolerState)
    }

    callback(null);
  }

  //------------------------------------------------------------------------//
  handleCoolingThresholdTemperatureGet(callback) {
    //this.platform.log.info('Triggered GET CoolingTemperature: ', this.States.CoolingThresholdTemperature);
    callback(null, this.States.CoolingThresholdTemperature);
  }

  handleCoolingThresholdTemperatureSet(value, callback) {
    if (value !== this.States.CoolingThresholdTemperature) {
      this.platform.log.info('Change CoolingTemperature: ', this.States.CoolingThresholdTemperature, "->", value);
      this.States.CoolingThresholdTemperature = value;
      this.States.CurrentTemperature = value;
      this.States.Temperature = value;
      this.send_message(this.States.Active, this.States.TargetHeaterCoolerState)
    }
    callback(null);
  }

  //------------------------------------------------------------------------//
  handleHeatingThresholdTemperatureGet(callback) {
    //this.platform.log.info('Triggered GET HeatingTemperature: ', this.States.HeatingThresholdTemperature);
    callback(null, this.States.HeatingThresholdTemperature);
  }

  handleHeatingThresholdTemperatureSet(value, callback) {
    if (value !== this.States.HeatingThresholdTemperature) {
      this.platform.log.info('Change HeatingTemperature: ', this.States.HeatingThresholdTemperature, "->", value);
      this.States.HeatingThresholdTemperature = value;
      this.States.CurrentTemperature = value;
      this.States.Temperature = value;
      this.send_message(this.States.Active, this.States.TargetHeaterCoolerState)
    }
    callback(null);
  }


//------------------------------------------------------------------------//
  handleCurrentTemperatureGet(callback) {
    //this.platform.log.info('Triggered GET CurrentTemperature: ', this.States.CurrentTemperature);
    callback(null, this.States.CurrentTemperature);
  }

}
