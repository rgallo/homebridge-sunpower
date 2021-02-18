import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SunpowerLightAccessory } from './lightAccessory';
import { SunpowerDailyMixAccessory } from './humidityAccessory';

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

    const productionUUID = this.api.hap.uuid.generate('sunpower-production');
    const existingProductionAccessory = this.accessories.find(accessory => accessory.UUID === productionUUID);
    let productionAccessory: SunpowerLightAccessory;
    if (existingProductionAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingProductionAccessory.displayName);
      existingProductionAccessory.context.device = { name: 'Current Production' };
      this.api.updatePlatformAccessories([existingProductionAccessory]);
      productionAccessory = new SunpowerLightAccessory(this, existingProductionAccessory);
    } else {
      this.log.info('Adding new accessory:', 'Sunpower Production');
      const accessory = new this.api.platformAccessory('Sunpower Production', productionUUID);
      accessory.context.device = { name: 'Current Production' };
      productionAccessory = new SunpowerLightAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    const consumptionUUID = this.api.hap.uuid.generate('sunpower-consumption');
    const existingConsumptionAccessory = this.accessories.find(accessory => accessory.UUID === consumptionUUID);

    let consumptionAccessory: SunpowerLightAccessory;
    if (existingConsumptionAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingConsumptionAccessory.displayName);
      existingConsumptionAccessory.context.device = { name: 'Current Consumption' };
      this.api.updatePlatformAccessories([existingConsumptionAccessory]);
      consumptionAccessory = new SunpowerLightAccessory(this, existingConsumptionAccessory);
    } else {
      this.log.info('Adding new accessory:', 'Sunpower Consumption');
      const accessory = new this.api.platformAccessory('Sunpower Consumption', consumptionUUID);
      accessory.context.device = { name: 'Current Consumption' };
      consumptionAccessory = new SunpowerLightAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    const dailyMixUUID = this.api.hap.uuid.generate('sunpower-dailymix');
    const existingDailyMixAccessory = this.accessories.find(accessory => accessory.UUID === dailyMixUUID);
    let dailyMixAccessory: SunpowerDailyMixAccessory;
    if (existingDailyMixAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingDailyMixAccessory.displayName);
      existingDailyMixAccessory.context.device = { name: 'Daily Mix' };
      this.api.updatePlatformAccessories([existingDailyMixAccessory]);
      dailyMixAccessory = new SunpowerDailyMixAccessory(this, existingDailyMixAccessory);
    } else {
      this.log.info('Adding new accessory:', 'Sunpower Daily Mix');
      const accessory = new this.api.platformAccessory('Sunpower Daily Mix', dailyMixUUID);
      accessory.context.device = { name: 'Daily Mix' };
      dailyMixAccessory = new SunpowerDailyMixAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }

    let token = '';
    let address = '';
    setInterval(async () => {
      if (!token) {
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
  
      productionAccessory.setValue(production);
      consumptionAccessory.setValue(consumption);
  
      this.log.debug('Production:', production);
      this.log.debug('Consumption:', consumption);
  
      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${('0' + (now.getMonth() + 1)).slice(-2)}-${('0' + now.getDate()).slice(-2)}`;
      const dailyMixResponse = await fetch(`https://elhapi.edp.sunpower.com/v2/elh/address/${address}/power?` +
        `endtime=${formattedDate}T23:59:59&starttime=${formattedDate}T00:00:00`, { headers });
      const dailyMixJson = await dailyMixResponse.json();
      const powerData = dailyMixJson.powerData;
      const solarEnergy = powerData.map(e => parseFloat(e.split(',')[1] || 0.0)).reduce((a, b) => a + b, 0.0);
      const totalEnergy = powerData.map(e => parseFloat(e.split(',')[2] || 0.0)).reduce((a, b) => a + b, 0.0);
      dailyMixAccessory.setValue(solarEnergy/totalEnergy);
      this.log.debug('Daily Mix:', (solarEnergy/totalEnergy)*100);
    }, 30000);
  }
}
