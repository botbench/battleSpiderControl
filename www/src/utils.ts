/*----------------------------------------------------------------------------*/
/*                                                                            */
/*    Copyright (c) Botbench, All rights reserved.                            */
/*                                                                            */
/*    Module:     utils.ts                                                    */
/*    Author:     Xander Soldaat                                              */
/*    Created:    June 2017                                                   */
/*                                                                            */
/*----------------------------------------------------------------------------*/

"use strict";

interface Number 
{
    pad(size: number): string;
    clamp( min: number, max: number): number;
}

/**
 * Pad a number with 0s
 *
 * @param {number} size The total length of the result string
 * @return {string} padded number
 */
Number.prototype.pad = function ( size: number ) : string
{
    var s = String ( this );
    while ( s.length < ( size || 2 ) ) { s = "0" + s; }
    return s;
}

/**
 * Returns a number whose value is limited to the given range.
 *
 * Example: limit the output of this computation to between 0 and 255
 * (x * 255).clamp(0, 255)
 *
 * @param {number} min The lower boundary of the output range
 * @param {number} max The upper boundary of the output range
 * @return {number} A number in the range [min, max]
 */
Number.prototype.clamp = function ( min: number, max: number ): number {
    return Math.min ( Math.max ( this, min) , max ) ;
};

namespace com.botbench.utils
{
    let startDate = new Date();
    let startTime = startDate.getTime();

    /**
     * Log a message to the console.log. Prepends the message with a timestamp in ms since start of execution
     * @param {string} message to be sent to the console
     * @param {boolean} debugEnable disable or enable the message sending
     */
    export function debugLog ( message: string, debugEnable: boolean ) 
    {
        if (debugEnable != null)
        {
            if (debugEnable)
            {
                var d = new Date();
                var n = d.getTime() - startTime;
                console.log ( n.pad ( 6 ) + ": " + message );
            }
        }
    }

    /**
     * Check to see if object is null or undefined
     * @param {any} object to check
     * @return {boolean} true if null or undefined
     */
    export function isNullOrUndefined ( arg: any ): boolean
    {
        return arg === null || arg === undefined;
    }

    /**
     * check object is defined and not null
     * @param {any} object to check
     * @return {boolean} false if null or undefined
     */
    export function isDefAndNotNull ( arg: any ): boolean
    {
        return arg !== null && arg !== undefined;
    };

    /**
     * check object is a function
     * @param {any} object to check
     * @return {boolean} false if null or undefined
     */
    export function isFunction ( functionToCheck: any ): boolean {
        var getType = {};

        // Check if it's defined
        if ( isNullOrUndefined ( functionToCheck ) )
            return false;

        return functionToCheck && getType.toString.call ( functionToCheck ) === '[object Function]';
    }
}


