import { Service, PlatformAccessory } from 'homebridge';

import { SunpowerPlatform } from './platform';


export class SunpowerLightAccessory {
  private service: Service;

  constructor(
    private readonly platform: SunpowerPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Sunpower')
      .setCharacteristic(this.platform.Characteristic.Model, 'psv6'); 

    this.service = this.accessory.getService(accessory.context.device.name) ||
      this.accessory.addService(this.platform.Service.LightSensor, accessory.context.device.name);

  }

  public setValue(value: number) {
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, value*1000.0);
  }

}
