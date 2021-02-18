import { Service, PlatformAccessory } from 'homebridge';

import { SunpowerPlatform } from './platform';


export class SunpowerDailyMixAccessory {
  private service: Service;

  constructor(
    private readonly platform: SunpowerPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Sunpower')
      .setCharacteristic(this.platform.Characteristic.Model, 'psv6'); 

    this.service = this.accessory.getService(accessory.context.device.name) ||
      this.accessory.addService(this.platform.Service.HumiditySensor, accessory.context.device.name);

  }

  public setValue(value: number) {
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, value*100);
  }

}
