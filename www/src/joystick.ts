/*----------------------------------------------------------------------------*/
/*                                                                            */
/*    Copyright (c) Botbench 2019, All rights reserved.                       */
/*                                                                            */
/*    Module:     joypad.ts                                                   */
/*    Author:     Xander Soldaat, based on code found here:                   */
/*                https://codepen.io/kaolay/pen/ZaMNqr                        */
/*    Created:    April 2019                                                  */
/*                                                                            */
/*----------------------------------------------------------------------------*/
 
"use strict";
 
namespace com.botbench
{
    // Debugging flag
    let joystickDebug = true;

    enum tJoystickType {
        horizontal,
        vertical,
    };

    // This is the joypad class
    export class joyStick 
    {
        private joystickType = tJoystickType.horizontal;

        // callback for the move events
        private moveCB: any;

        // This is the max value the joypad can output
        private minValue = -100;
        private maxValue = 100;

        // The range we have in the x and y axis
        private yRange = 0;
        private xRange = 0;

        // Holds the coordinates of the initial touch event that starts the drag
        private dragStart = {
            x: 0,
            y: 0,
            dragging: false
        };

        // Our current position
        private currPosition = {
            x: 0,
            y: 0
        };

        // This should be the div that holds the joystick
        private container: HTMLElement;
        
        // This is the circle for the joypad
        private joypadButton: HTMLElement;

        // This is our name
        private containerID: string;
        private buttonID: string;

        /**
        * Class constructor
        */
        constructor ( container: HTMLElement, callback: any )
        {
            if ( utils.isNullOrUndefined ( container ) )
            {
                utils.debugLog ( "container is null", true );
                return;
            }
            // This is where we live now
            this.container = container;
            this.containerID = this.container.getAttribute ( "id" );

            this.moveCB = callback;

            // Get the type of joystick we are
            if ( this.container.classList.contains ( "horizontal" ) )
                this.joystickType = tJoystickType.horizontal;
            else if ( this.container.classList.contains ( "vertical" ) )
                this.joystickType = tJoystickType.vertical;

            // Dynamically add a button to the slider div
            this.buttonID = this.containerID + "_button";

            $ ("<div id='" + this.buttonID + "' class='joypadButton'/>").appendTo ( $ ( this.container ) );
            this.joypadButton = $ ( "#" + this.buttonID  )[0];

            let rect = this.container.getBoundingClientRect();

            // Get the range of the X and Y axes
            this.yRange = rect.height / 2;
            this.xRange = rect.width / 2;

            // Setup the height and width of the slider button
            if ( this.joystickType == tJoystickType.horizontal )
            {
                this.joypadButton.style.height = this.container.clientHeight + "px";
                this.joypadButton.style.left = rect.left + ( rect.width / 2 ) + "px";
            }
            else
            {
                this.joypadButton.style.height = this.container.clientWidth + "px";
                this.joypadButton.style.top = rect.top + ( rect.height / 2 ) + "px";
            }

            this.joypadButton.style.width = this.joypadButton.style.height

            this.bindEvents();
        }

        /**
        * Bind all the event handlers
        */
        private bindEvents () 
        {
            // These are the only events we're interested in
            this.joypadButton.addEventListener ( 'touchstart', ( e: TouchEvent ) => {
                this.touchStart( e );
            });

            this.joypadButton.addEventListener ( 'touchmove', ( e: TouchEvent ) => {
                this.touchMove( e );
            });

            this.joypadButton.addEventListener ( 'touchend', () => {
                this.touchEnd();
            });
        }

        /**
        * Handler for touchstart event
        * @param {TouchEvent} e the event object
        */   
        private touchStart ( e: TouchEvent )
        {
            utils.debugLog ( "joyPad::touchStart", joystickDebug ); 

            // We want this to be fast, not like syrup
            this.joypadButton.style.transition = '0s';

            // Where the dragging starts
            if ( e.changedTouches.length > 0 )
            {
                // Go through the touch event points and only deal with the ones
                // pertaining to us.
                for ( let i = 0; i < e.changedTouches.length; i++ )
                {
                    // Get the element ID
                    let target = <HTMLElement>(e.changedTouches [ i ].target);
                    let targetID = target.getAttribute ( "id" );

                    // We have a winner, stop searching
                    if ( targetID === this.buttonID )
                    {
                        this.dragStart.x = e.changedTouches[ i ].clientX;
                        this.dragStart.y = e.changedTouches[ i ].clientY;
                        this.dragStart.dragging = true;
                        break;
                    }
                }
            }
            else
            {
                return;
            }
        }

        /**
        * Handler for touchmove event
        * @param {TouchEvent} e the event object
        */   
        private touchMove ( e: TouchEvent )
        {
            utils.debugLog ( "joyPad::touchMove", joystickDebug ); 

            // Local variables for various things
            let x = 0;
            let y = 0;
            let xDelta = 0;
            let yDelta = 0;
            let xJoy = 0;
            let yJoy = 0;

            let bFound = false;

            // Do nothing if we're not dragging
            if ( this.dragStart.dragging === false )
                return;

            // Not sure why this is needed, but I'll leave it for now.
            e.preventDefault();

            // If there are touch changes, get the new data
            if ( e.changedTouches.length > 0 )
            {
                // Go through the touch event points and only deal with the ones
                // pertaining to us.
                for ( let i = 0; i < e.changedTouches.length; i++ )
                {
                    // Get the element ID
                    let target = <HTMLElement>(e.changedTouches [ i ].target);
                    let targetID = target.getAttribute ( "id" );

                    // We have a winner, stop searching
                    if ( targetID === this.buttonID )
                    {
                        utils.debugLog ( "joyPad::touchMove targetID: " + targetID + ", containerID: " + this.buttonID, joystickDebug ); 
                        x = e.changedTouches[ i ].clientX;
                        y = e.changedTouches[ i ].clientY;
                        console.log ( "x: " + x + ", y: " + y );
                        bFound = true;
                        break;
                    }
                }
            }
            // There are no touch changes
            else
            {
                return;
            }

            // We did not find an element we're interested in
            if ( !bFound )
                return;

            // How much have we been dragged?
            xDelta = x - this.dragStart.x;
            yDelta = y - this.dragStart.y;

            // Make sure we don't go outside our client area
            if ( this.joystickType == tJoystickType.horizontal )
            {
                xDelta = xDelta.clamp ( -this.xRange, this.xRange );

                // Calculate the joystick value
                xJoy = ( xDelta / this.xRange ) * 100;
            } 
            else if ( this.joystickType == tJoystickType.vertical )
            {
                yDelta = yDelta.clamp ( -this.yRange, this.yRange );

                // Calculate the joystick value
                yJoy = ( yDelta / this.yRange ) * 100;       
            }

            // Set the value, which will move the button to the right spot
            this.setValue ( xJoy, yJoy );

            // Call the UI to let it know that things have been moved
            if ( utils.isFunction ( this.moveCB ) )
            {
                // Veritcal slider has its y values inverted, so multiply by -1
                if ( this.joystickType == tJoystickType.vertical )
                    this.moveCB ( Math.round ( yJoy ) * -1 );
                else
                    this.moveCB ( Math.round ( xJoy ) );
            }
        }

        /**
        * Handler for touchend event
        */   
        private touchEnd ()
        {
            utils.debugLog ( "joyPad::touchEnd", joystickDebug ); 

            // Do nothing if we're not draaging
            if ( this.dragStart.dragging === false )
                return;
            
            // The transition allows for a slightly smoother move from the original position to the center
            this.container.style.transition = '.1s';

            // Move the button to the center
            this.setValue ( 0, 0 );

            // We're not dragging any more
            this.dragStart.dragging = false;

            // // Call the UI to let it know that things have been moved
            if ( utils.isFunction ( this.moveCB ) )
                this.moveCB ( 0 );
        }

        /**
        * Set the values on the joystick
        * @param {number} x the value to set for the x axis
        * @param {number} x the value to set for the y axis
        */   
        setValue ( x: number, y: number )
        {
            utils.debugLog ( "joyStick::setValue: x: " + x + ", y: " + y, joystickDebug );

            x = x.clamp ( this.minValue, this.maxValue );
            y = y.clamp ( this.minValue, this.maxValue );
            
            // Translate the values to actual positions
            if ( x < 0 )
                this.currPosition.x = 0 - x * ( this.xRange / this.minValue );
            else 
                this.currPosition.x = x * ( this.xRange / this.maxValue );

            if ( y < 0 )
                this.currPosition.y = 0 - y * ( this.yRange / this.minValue );
            else 
                this.currPosition.y = y * ( this.yRange / this.maxValue );

            // Now set the position of our thumb image
            this.setPosition();
        }

        /**
        * Set the position of the thumb icon
        */
        private setPosition()
        {
            // Move the pretty joypad button picture
            switch ( this.joystickType )
            {
                case tJoystickType.horizontal:
                    let x = this.xRange + this.currPosition.x - ( this.joypadButton.clientHeight / 2 );
                    this.joypadButton.style.transform = `translate3d(${x}px, 0px, 0px)`;
                    break;           
                case tJoystickType.vertical:
                    let y = this.yRange + this.currPosition.y - ( this.joypadButton.clientHeight / 2 );
                    this.joypadButton.style.transform = `translate3d(0px, ${y}px, 0px)`;
                    break;           
            }
        }
    }
}