
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# homebridge-sunpower

This is a big work-in-progress/proof of concept to get Sunpower production/consumption/daily mix info into Homebridge.  Production and consumption should show as light sensors with values in watts, and daily mix as a humidity sensor.  Everything is still up in the air for these decisions (especially the humidity sensor, as I'm pretty sure this won't work above 100%), and this is also my first time working with Homebridge, so feel free to contribute!


Example config:
```
        {
            "name": "Sunpower",
            "platform": "Sunpower",
            "username": "sunpower.username@email.com",
            "password": "sunpowerpassword"
        }
```