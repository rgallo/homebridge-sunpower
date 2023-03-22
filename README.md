## Note: This project does not work with the newest Sunpower API.  It will be updated as soon as the new API is worked out.
### Further details in this issue: https://github.com/rgallo/homebridge-sunpower/issues/8#issuecomment-1169086134


<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# homebridge-sunpower

This is a big work-in-progress/proof of concept to get Sunpower production/consumption/daily mix info into Homebridge.  

This plugin has two sets of two lightbulbs. Current Import and Current Export will be switched on or off depending on if you are 
net importing or exporting currently, the brightness represents the percentage of your import/export from/to the grid, 
and the light sensor represents the power being generated, in kilowatts.  Daily Import/Export lightbulbs are similar but for the current day.

Current design inspired by https://github.com/longzheng/homebridge-fronius-inverter-lights


Example config:
```
        {
            "name": "Sunpower",
            "platform": "Sunpower",
            "username": "sunpower.username@email.com",
            "password": "sunpowerpassword"
        }
```
