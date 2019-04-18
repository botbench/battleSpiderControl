/*----------------------------------------------------------------------------*/
/*                                                                            */
/*    Copyright (c) Botbench 2019, All rights reserved.              	      */
/*                                                                            */
/*    Module:     main.ts                                                     */
/*    Author:     Xander Soldaat                                              */
/*    Created:    April 2019                                                  */
/*                                                                            */
/*----------------------------------------------------------------------------*/

/// <reference types="jquery"/>
/// <reference path="../types/cordova-plugin-ble-central.d.ts" />

let spiderDebug = true;

namespace com.botbench.battlespider
{
    let bluefruitBLEInfo = {
        serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        txCharacteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // transmit is from the phone's perspective
        rxCharacteristic: '6e400003-b5a3-f393-e0a9-e50e24dcca9e'  // receive is from the phone's perspective
    };

    let bConnecting = true;
    let bConnected = true;

    let throttleValue = 0;
    let turningValue = 0;

    let transmitTimer: any;

    let spiderDeviceID: string;

    // This event is fired off once all the Cordova modules have been loaded and initialised
    document.addEventListener ( 'deviceready', () => { 
        main();
    } );

    /**
    * Main app entry point
    */
    export function main ()
    {
        let throttleDiv = document.getElementById ( "throttleSlider" );
        let turningDiv = document.getElementById ( "turningSlider" );
        let throttleSlider = new joyStick ( throttleDiv, ( value: number ) => handleThrottle ( value ) );
        let turningSlider = new joyStick ( turningDiv, ( value: number ) => handleTurning ( value ) );

        throttleSlider.setValue ( 0, 0 );
        turningSlider.setValue ( 0, 0 );

        throttleValue = 0;
        turningValue = 0;
        
        bConnected = false;
        bConnecting = false;

        transmitTimer = null;

        $ ( "#controlButton" ).on ( "touchstart", () => {
            $ ( "#controlButton" ).removeClass ( "released" );
            $ ( "#controlButton" ).addClass ( "pressed" );
        });

        $ ( "#controlButton" ).on ( "touchend", () => {
            $ ( "#controlButton" ).removeClass ( "pressed" );
            $ ( "#controlButton" ).addClass ( "released" );

            if ( bConnected )
                disconnectFromBattleSpider();
            else
                searchForBattleSpider();
        })
    }

    /**
    * Connect to the Battle Spider via BLE
    */
    function connectToBattleSpider ( deviceID: string )
    {
        ble.autoConnect ( deviceID, ( data: BLECentralPlugin.PeripheralDataExtended ) =>  handleConnectedSpider ( data ), () => handleDisconnectedSpider() );
        bConnecting = true;
    }

    /**
    * Disconnect from Battle Spider
    */
    function disconnectFromBattleSpider()
    {
        utils.debugLog ( "disconnectFromBattleSpider",  spiderDebug );
        
        ble.disconnect ( spiderDeviceID, () => handleDisconnectedSpider(), () => showError ( "Could not disconnect") );
    }

    /**
    * Start searching for a Battle Spider
    */
    function searchForBattleSpider()
    {
        utils.debugLog ( "searchForBattleSpider",  spiderDebug );

        if ( bConnected || bConnecting )
            return;

        ble.scan ( [ bluefruitBLEInfo.serviceUUID ], 5, ( device: BLECentralPlugin.PeripheralData ) => handleFoundBattleSpider ( device ) , () => showError ( "scan error") );

        $ ( "#controlButton" ).addClass ( "fadeinout" );
    }

    /**
    * We've found a Battle Spider
    * @param {BLECentralPlugin.PeripheralData} device the newly found device
    */
    function handleFoundBattleSpider ( device: BLECentralPlugin.PeripheralData )
    {
        utils.debugLog ( "handleFoundBattleSpider: Found Spider: " + device.name,  spiderDebug );

        if ( bConnected || bConnecting )
            return;

        connectToBattleSpider ( device.id );
    }

    /**
    * Callback for when the Battle Spider gets connected
    */
    function handleConnectedSpider ( device: BLECentralPlugin.PeripheralDataExtended )
    {
        utils.debugLog ( "handleConnectedSpider: data.name: " + device.name,  spiderDebug );

        spiderDeviceID = device.id;

        throttleValue = 0;
        turningValue = 0;

        bConnecting = false;
        bConnected = true;

        $ ( "#controlButton" ).removeClass ( "fadeinout" );
        $ ( "#controlButton" ).removeClass ( "start" );
        $ ( "#controlButton" ).addClass ( "stop" );

        startTransmitLoop();
    }

    /**
    * Callback for when the Battle Spider gets disconnected
    */
    function handleDisconnectedSpider ( )
    {
        utils.debugLog ( "handleDisconnectedSpider",  spiderDebug );

        bConnecting = false;
        bConnected = false;

        stopTransmitLoop();

        $ ( "#controlButton" ).removeClass ( "fadeinout" );
        $ ( "#controlButton" ).removeClass ( "stop" );
        $ ( "#controlButton" ).addClass ( "start" );
    }

    /**
    * Display an error
    */
    function showError ( errorMessage: string )
    {
        utils.debugLog ( "An erroneous error has occurred: " + errorMessage, true );
    }

    /**
    * Callback for throttle slider
    * @param {number} value the throttle value
    */
    function handleThrottle ( value: number )
    {
        utils.debugLog ( "handleThrottle: value: " + value,  spiderDebug );

        throttleValue = value;
    }

    /**
    * Callback for turning slider
    * @param {number} value the turning value
    */
    function handleTurning ( value: number )
    {
        utils.debugLog ( "handleTurning: value: " + value,  spiderDebug );

        turningValue = value;
    }

    /**
    * Start the transmission loop, set to 100ms
    */
    function startTransmitLoop()
    {
        utils.debugLog ( "startTransmitLoop",  spiderDebug );

        stopTransmitLoop();

        if ( bConnected )
        {
            transmitTimer = setInterval ( () => {
                transmitData();
            }, 100 );
        }
    }

    /**
    * Stop the transmission loop
    */
    function stopTransmitLoop()
    {
        utils.debugLog ( "stopTransmitLoop",  spiderDebug );

        if ( utils.isDefAndNotNull ( transmitTimer  ))
        {
            clearInterval ( transmitTimer );
            transmitTimer = null;
        }
    }

    /**
    * Transmit the data to the Battle Spider
    */
    function transmitData()
    {
        utils.debugLog ( "transmitData",  spiderDebug );

        let dataPacket = new Uint8Array ( 1 );

        // Create the data packet
        dataPacket [ 0 ] = 0;
        dataPacket [ 0 ] |= joyPadToSpiderSpeed ( throttleValue );
        dataPacket [ 0 ] |= joyPadToSpiderSpeed ( turningValue ) << 4;

        // Send the data packet, fire and forget
        if ( bConnected )
            ble.writeWithoutResponse ( spiderDeviceID, bluefruitBLEInfo.serviceUUID, bluefruitBLEInfo.txCharacteristic, dataPacket.buffer );
    }

    /**
    * Convert the joypad value to something the Spider can understand
    */
    function joyPadToSpiderSpeed ( value: number ) : number
    {
        utils.debugLog ( "joyPadToSpiderSpeed",  spiderDebug );

        if ( value < -80 )
            return 1;
        else if ( value < -60 )
             return 2;
        else if ( value < -40 )
            return 3;
        else if ( value < -20 )
            return 4;
        else if ( value < 20 )
            return 0;
        else if ( value < 40 )
            return 5;
        else if ( value < 60 )
            return 6;
        else if ( value < 80 )
            return 7;
        else
            return 8;
    }
}