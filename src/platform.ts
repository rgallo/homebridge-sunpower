import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic, Accessory } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SunpowerLightAccessory } from './lightAccessory';
import { SunpowerDailyMixAccessory } from './humidityAccessory';

import fetch from 'node-fetch';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class SunpowerPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {

    const productionUUID = this.api.hap.uuid.generate('sunpower-production');
    
    const existingProductionAccessory = this.accessories.find(accessory => accessory.UUID === productionUUID);
    // if (existingProductionAccessory) {
    //   this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingProductionAccessory]);
    // }
    let productionAccessory: SunpowerLightAccessory;
    if (existingProductionAccessory) {
      // productionAccessory = existingProductionAccessory;
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
      // productionAccessory = accessory;
    }

    const consumptionUUID = this.api.hap.uuid.generate('sunpower-consumption');
    const existingConsumptionAccessory = this.accessories.find(accessory => accessory.UUID === consumptionUUID);
    // if (existingConsumptionAccessory) {
    //   this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingConsumptionAccessory]);
    // }
    let consumptionAccessory: SunpowerLightAccessory;
    if (existingConsumptionAccessory) {
      // consumptionAccessory = existingConsumptionAccessory;
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
      // consumptionAccessory = accessory;
    }

    const dailyMixUUID = this.api.hap.uuid.generate('sunpower-dailymix');
    const existingDailyMixAccessory = this.accessories.find(accessory => accessory.UUID === dailyMixUUID);
    // if (existingDailyMixAccessory) {
    //   this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingDailyMixAccessory]);
    // }
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
