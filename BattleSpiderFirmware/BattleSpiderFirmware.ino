/*----------------------------------------------------------------------------*/
/*                                                                            */
/*    Copyright (c) Botbench 2019, All rights reserved.                       */
/*                                                                            */
/*    Module:     RC_Spider                                                   */
/*    Author:     Xander Soldaat                                              */
/*    Created:    April 2019                                                  */
/*                                                                            */
/*----------------------------------------------------------------------------*/

/*
 * Default BLE config code taken from Bluefruit LE example code
 */
#include <Arduino.h>
#include <SPI.h>
#if not defined (_VARIANT_ARDUINO_DUE_X_) && not defined (_VARIANT_ARDUINO_ZERO_)
  #include <SoftwareSerial.h>
#endif

#include "Adafruit_BLE.h"
#include "Adafruit_BluefruitLE_SPI.h"
#include "Adafruit_BluefruitLE_UART.h"

#include "BluefruitConfig.h"

// Pins for the motor controller
int PWMA = 13;
int PWMB = 11;

int AOUT1 = A4;
int AOUT2 = A5;

int BOUT1 = 6;
int BOUT2 = 5;


unsigned long int startTime = 0;
/*=========================================================================
    APPLICATION SETTINGS
    -----------------------------------------------------------------------*/
    #define FACTORYRESET_ENABLE         1
    #define MINIMUM_FIRMWARE_VERSION    "0.6.6"
    #define MODE_LED_BEHAVIOUR          "MODE"
/*=========================================================================*/

// Create the bluefruit object, either software serial...uncomment these lines

/* ...hardware SPI, using SCK/MOSI/MISO hardware SPI pins and then user selected CS/IRQ/RST */
Adafruit_BluefruitLE_SPI ble(BLUEFRUIT_SPI_CS, BLUEFRUIT_SPI_IRQ, BLUEFRUIT_SPI_RST);

// A small helper
void error(const __FlashStringHelper*err) {
  Serial.println(err);
  while (1);
}

/**
* Set up the HW an the BLE module and hardware pins
*/
void setup(void)
{
  pinMode(LED_BUILTIN, OUTPUT);
    
  // Setting up the pins for the motor control
  pinMode(PWMA, OUTPUT);
  pinMode(PWMB, OUTPUT);
  digitalWrite(PWMA, HIGH);
  digitalWrite(PWMB, HIGH);

  pinMode(AOUT1, OUTPUT);
  pinMode(AOUT2, OUTPUT);

  pinMode(BOUT1, OUTPUT);
  pinMode(BOUT2, OUTPUT);

  Serial.begin(115200);
  Serial.println(F("Adafruit Bluefruit Command <-> Data Mode Example"));
  Serial.println(F("------------------------------------------------"));

  /* Initialise the module */
  Serial.print(F("Initialising the Bluefruit LE module: "));

  if ( !ble.begin(VERBOSE_MODE) )
  {
    error(F("Couldn't find Bluefruit, make sure it's in CoMmanD mode & check wiring?"));
  }
  Serial.println( F("OK!") );

  if ( FACTORYRESET_ENABLE )
  {
    /* Perform a factory reset to make sure everything is in a known state */
    Serial.println(F("Performing a factory reset: "));
    if ( ! ble.factoryReset() ){
      error(F("Couldn't factory reset"));
    }
  }

  /* Disable command echo from Bluefruit */
  ble.echo(false);

  Serial.println("Requesting Bluefruit info:");
  /* Print Bluefruit information */
  ble.info();

  Serial.println(F("Please use Adafruit Bluefruit LE app to connect in UART mode"));
  Serial.println(F("Then Enter characters to send to Bluefruit"));
  Serial.println();

  ble.verbose(false);  // debug info is a little annoying after this point!

  /* Wait for connection */
  while (! ble.isConnected()) {
      delay(500);
  }

  Serial.println(F("******************************"));

  // LED Activity command is only supported from 0.6.6
  if ( ble.isVersionAtLeast(MINIMUM_FIRMWARE_VERSION) )
  {
    // Change Mode LED Activity
    Serial.println(F("Change LED activity to " MODE_LED_BEHAVIOUR));
    ble.sendCommandCheckOK("AT+HWModeLED=" MODE_LED_BEHAVIOUR);
  }

  // Set module to DATA mode
  Serial.println( F("Switching to DATA mode!") );
  ble.setMode(BLUEFRUIT_MODE_DATA);

  Serial.println(F("******************************"));
}

/**
* Constantly poll for new command data
*/
void loop(void)
{
  // check if data is available, if so, process it
  if ( ble.available() )
  {
    byte c = ble.read();



    byte throttleSpeed = ( c & 0x0F ) >> 0;
    byte turningSpeed  = ( c & 0xF0 ) >> 4;

    int throttlePWM = serialToPWM ( throttleSpeed );
    int turningPWM = serialToPWM ( turningSpeed );

    /*----------------------------------------------------------------------------*/
    /*                                                                            */
    /* Enable the lines below to enable debugging of the incoming data            */
    /*                                                                            */
    /*----------------------------------------------------------------------------*/

#if 0
    char debugString[64];
    sprintf ( debugString, "throttle: %d ( %d ), turning: %d ( %d )\n", throttleSpeed, throttlePWM, turningSpeed, turningPWM );
    Serial.print ( debugString );
#endif

    doMotion ( throttlePWM );
    doTurn ( turningPWM );

    // Reset the timer
    startTime = millis();
  }
  else
  {
    // Get the current time
    unsigned long currentTime = millis();

    // Check if more than 100ms has elapsed since the last message,
    // if so, stop
    if ( ( currentTime - startTime ) > 100 )
    {
      doMotion ( 0 );
      doTurn ( 0 );
    }
  }
}

/**
* Move the robot's legs forward or backwards
* @param {int} PWM the pwm level ( 0 -255 )
*/
void doMotion ( int PWM )
{
  analogWrite ( PWMA, abs ( PWM ) );
  if ( PWM == 0 )
  {
    digitalWrite(AOUT1, LOW);
    digitalWrite(AOUT2, LOW);
  }
  if ( PWM < 0 )
  {
    digitalWrite(AOUT1, LOW);
    digitalWrite(AOUT2, HIGH);
  }
  else 
  {
    digitalWrite(AOUT1, HIGH);
    digitalWrite(AOUT2, LOW);
  }
}

/**
* Move the robot's body turn left or right
* @param {int} PWM the pwm level ( 0 -255 )
*/
void doTurn ( int PWM )
{
  analogWrite ( PWMB, abs ( PWM ) );
  if ( PWM == 0 )
  {
    digitalWrite(BOUT1, LOW);
    digitalWrite(BOUT2, LOW);
  }
  if ( PWM < 0 )
  {
    digitalWrite(BOUT1, LOW);
    digitalWrite(BOUT2, HIGH);
  }
  else 
  {
    digitalWrite(BOUT1, HIGH);
    digitalWrite(BOUT2, LOW);
  }
}

/**
* Convert the command from the phone to a PWM level
* @param {char} serialValue ( 0 - 8 )
* @return {int} the PWM value 
*/
int serialToPWM ( char serialValue )
{
  switch ( serialValue )
  {
    case 0: return 0;
    case 1: return -255;
    case 2: return -191;
    case 3: return -128; 
    case 4: return -61;
    case 5: return 61;
    case 6: return 128;
    case 7: return 191;
    case 8: return 255;
  }
}

