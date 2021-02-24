import { Service, PlatformAccessory } from 'homebridge';

import { SunpowerPlatform } from './platform';


export class SunpowerLightAccessory {
  private lightbulbService: Service;
  private lightSensorService: Service;

  constructor(
    private readonly platform: SunpowerPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Sunpower')
      .setCharacteristic(this.platform.Characteristic.Model, 'psv6'); 

    this.lightbulbService = this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb, this.platform.Service.Lightbulb);

    this.lightSensorService = this.accessory.getService(this.platform.Service.LightSensor) ||
      this.accessory.addService(this.platform.Service.LightSensor, this.platform.Service.LightSensor);

  }

  public setStatus(isOn: boolean, brightness: number, lux: number) {
    this.lightbulbService.updateCharacteristic(this.platform.Characteristic.On, isOn);
    this.lightbulbService.updateCharacteristic(this.platform.Characteristic.Brightness, brightness);
    this.lightSensorService.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, lux);
  }

}
