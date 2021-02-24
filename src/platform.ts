import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SunpowerLightAccessory } from './lightAccessory';

import fetch from 'node-fetch';

export class SunpowerPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {


    interface SunpowerDevice {
      id: string;
      name: string;
      accessory?: SunpowerLightAccessory;
    }

    const currentProductionDevice: SunpowerDevice = {
      id: 'sunpower-current-production',
      name: 'Current Export',
      accessory: undefined,
    };
    const currentConsumptionDevice: SunpowerDevice = {
      id: 'sunpower-current-consumption',
      name: 'Current Import',
      accessory: undefined,
    };
    const dailyProductionDevice: SunpowerDevice = {
      id: 'sunpower-daily-production',
      name: 'Daily Export',
      accessory: undefined,
    };
    const dailyConsumptionDevice: SunpowerDevice = {
      id: 'sunpower-daily-consumption',
      name: 'Daily Import',
      accessory: undefined,
    };

    const devices = [currentProductionDevice, currentConsumptionDevice, dailyProductionDevice, dailyConsumptionDevice];

    devices.forEach(device => {
      const uuid = this.api.hap.uuid.generate(device.id);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        existingAccessory.context.device = { name: device.name };
        this.api.updatePlatformAccessories([existingAccessory]);
        device.accessory = new SunpowerLightAccessory(this, existingAccessory);
      } else {
        this.log.info('Adding new accessory:', device.name);
        const accessory = new this.api.platformAccessory(device.name, uuid);
        accessory.context.device = { name: device.name };
        device.accessory = new SunpowerLightAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    });

    let token = '';
    let address = '';
    let lastTokenHour = -1;
    setInterval(async () => {
      const today = new Date().getHours();
      if (!token || lastTokenHour !== today) { // Refresh token hourly
        const loginData = { 'password': this.config.password, 'username': this.config.username, 'isPersistent': false };
        const authResponse = await fetch('https://elhapi.edp.sunpower.com/v1/elh/authenticate', {
          method: 'POST',
          body: JSON.stringify(loginData),
          headers:
          {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'User-Agent': 'Mozilla/1.22 (compatible; MSIE 2.0; Windows 3.1)',
          },
        });
        const authJson = await authResponse.json();
        token = authJson.tokenID;
        address = authJson.addresses[0]; // TODO multiple addresses?
        lastTokenHour = today;
      }

      const headers = {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'User-Agent': 'Mozilla/1.22 (compatible; MSIE 2.0; Windows 3.1)',
        'Authorization': `SP-CUSTOM ${token}`,
      };

      const currentResponse = await fetch(`https://elhapi.edp.sunpower.com/v1/elh/address/${address}/currentpower`, { headers });
      const currentJson = await currentResponse.json();
      const production = currentJson.data.production;
      const consumption = currentJson.data.consumption;
      this.setBulbPairStatus(consumption, production, currentConsumptionDevice.accessory, currentProductionDevice.accessory);
      this.log.debug('Production:', production);
      this.log.debug('Consumption:', consumption);

      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${('0' + (now.getMonth() + 1)).slice(-2)}-${('0' + now.getDate()).slice(-2)}`;
      const dailyResponse = await fetch(`https://elhapi.edp.sunpower.com/v2/elh/address/${address}/power?` +
        `endtime=${formattedDate}T23:59:59&starttime=${formattedDate}T00:00:00`, { headers });
      const dailyJson = await dailyResponse.json();
      const powerData = dailyJson.powerData;
      const dailyProduction = powerData.map((e: string) => parseFloat(e.split(',')[1] || '0.0')).reduce((a, b) => a + b, 0.0);
      const dailyConsumption = powerData.map((e: string) => parseFloat(e.split(',')[2] || '0.0')).reduce((a, b) => a + b, 0.0);
      this.setBulbPairStatus(dailyConsumption, dailyProduction, dailyConsumptionDevice.accessory, dailyProductionDevice.accessory);
      this.log.debug('Daily Production:', dailyProduction);
      this.log.debug('Daily Consumption:', dailyConsumption);
    }, 30000);
  }

  setBulbPairStatus(consumption: number, production: number, importAccessory?: SunpowerLightAccessory, 
    exportAccessory?: SunpowerLightAccessory) {
    let pctExport: number, pctImport: number;
    if (consumption > production) {
      pctExport = 0.0;
      pctImport = Math.round(((consumption - production) / consumption) * 100.0);
    } else if (production > consumption) {
      pctImport = 0.0;
      pctExport = Math.round(((production - consumption) / production) * 100.0);
    } else {
      pctExport = 0.0;
      pctImport = 0.0;
    }
    this.log.debug('importAccessory', consumption >= production, pctImport, consumption);
    this.log.debug('exportAccessory', production >= consumption, pctExport, production);
    importAccessory?.setStatus(consumption >= production, pctImport, consumption);
    exportAccessory?.setStatus(production >= consumption, pctExport, production);
  }
}
