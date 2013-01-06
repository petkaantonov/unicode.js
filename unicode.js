/*
Copyright (c) 2012 Petka Antonov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:</p>

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*



todo:
Use fallback mechanism when encoding to UTFs as well

More 8-bit encodings, improve aliasing, add all aliases
uint8.charCodeAt method to allow arrays

New project (Short sample >0x80)
Tests
Docs

GBK <-- multi-byte,
gb18030 <-- multi-byte,
big5 <-- multi-byte,
big5-HKSCS <-- multi-byte
SHIFT_JIS <-- multi-byte 
EUC-jp <-- multi-byte
ISO-2022-JP <-- stateful?
Korean <-- multi-byte


*/
;(function(global, String) {
"use strict";

    function isUTF16() {
        try {
            var str = decodeURIComponent("%F0%A0%80%80");
            return str.charCodeAt(0) === 0xd840 &&
                   str.charCodeAt(1) === 0xdc00;
        }
        catch(e) {
            return false;
        }
    }
    
    if( !isUTF16() ) {
        throw new Error( "Internal encoding must be UTF-16");
    }

    var objCreate = Object.create || function( f ) {
        function Type() {}
        Type.prototype = f;
        return new Type();
    };

    var toClassName = {}.toString;

    var isArray = Array.isArray || function( obj ) {
        return toClassName.call( obj ) === "[object Array]";
    };

    
    //Credi panzi @ stackoverflow http://stackoverflow.com/a/3535758/995876
    function err(message, fileName, lineNumber) {
        var err = new Error();

        if (err.stack) {
            // remove one stack level:
            if (typeof(Components) != 'undefined') {
                // Mozilla:
                this.stack = err.stack.substring(err.stack.indexOf('\n')+1);
            }
            else if (typeof(chrome) != 'undefined' || typeof(process) != 'undefined') {
                // Google Chrome/Node.js:
                this.stack = err.stack.replace(/\n[^\n]*/,'');
            }
            else {
                this.stack = err.stack;
            }
        }
        this.message    = message    === undefined ? err.message    : message;
        this.fileName   = fileName   === undefined ? err.fileName   : fileName;
        this.lineNumber = lineNumber === undefined ? err.lineNumber : lineNumber;
    }

    function EncoderError() {
        err.apply( this, arguments );
    }
    
    EncoderError.prototype = objCreate(Error.prototype);
    EncoderError.constructor = EncoderError;
    EncoderError.prototype.name = "EncoderError";
    

    function DecoderError() {
        err.apply( this, arguments );
    }
    
    DecoderError.prototype = objCreate(Error.prototype);
    DecoderError.constructor = DecoderError;
    DecoderError.prototype.name = "DecoderError";
    

    var ascii = [
        0x0000,0x0001,0x0002,0x0003,0x0004,0x0005,0x0006,0x0007,0x0008,0x0009,0x000A,0x000B,0x000C,0x000D,0x000E,0x000F
        ,0x0010,0x0011,0x0012,0x0013,0x0014,0x0015,0x0016,0x0017,0x0018,0x0019,0x001A,0x001B,0x001C,0x001D,0x001E,0x001F
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0x007F
    ];
    
    var rHasBeyondBinary = /[^\x00-\xFF]/;
    
    function checkBinary( str ) {
        if( str instanceof ByteArray || isArray(str) ) {
            return str;
        }
        
        if( typeof str !== "string" || rHasBeyondBinary.test( str ) ) {
            throw new DecoderError( "String is not in binary form" );
        }
        return str;
    }

    function checkFallback( fallback ) {
        switch( fallback ) {
            case REPLACEMENT_FALLBACK:
            case ERROR_FALLBACK:
            case IGNORE_FALLBACK:
                break;
            default:
                fallback = _fallback;
        }
        return fallback;
    }
    
    function isCodePoint( code ) {
        return (0x000 <= code && code < 0xD800) ||
                (0xDFFF < code && code <= 0x10FFFF);
    }
    
    function isHighSurrogate( code ) {
        return 0xD800 <= code && code <= 0xDBFF;
    }
    
    function isLowSurrogate( code ) {
        return 0xDC00 <= code && code <= 0xDFFF;
    }

    var unicode = {};
    
    var LITTLE_ENDIAN = unicode.LITTLE_ENDIAN = 1;
    var BIG_ENDIAN = unicode.BIG_ENDIAN = 2;
    
    var REPLACEMENT_FALLBACK = unicode.REPLACEMENT_FALLBACK = 3;
    var IGNORE_FALLBACK = unicode.IGNORE_FALLBACK = 4;
    var ERROR_FALLBACK = unicode.ERROR_FALLBACK = 5;

    var UTF32BEBOM = unicode.UTF32BEBOM = "\x00\x00\xFE\xFF";
    var UTF32LEBOM = unicode.UTF32LEBOM = "\xFF\xFE\x00\x00";
    var UTF16BEBOM = unicode.UTF16BEBOM = "\xFE\xFF";
    var UTF16LEBOM = unicode.UTF16LEBOM = "\xFF\xFE";
    var UTF8BOM = unicode.UTF8BOM = "\xEF\xBB\xBF";
    
    var MACHINE_ENDIANESS;
    var _fallback = REPLACEMENT_FALLBACK;
    
    unicode.config = {
        fallback: function( fallback ) {
            if( arguments.length < 1 ) {
                return _fallback;
            }
            else {
                switch( fallback ) {
                    case REPLACEMENT_FALLBACK:
                    case ERROR_FALLBACK:
                    case IGNORE_FALLBACK:
                        _fallback = fallback;
                        break;
                    default:
                        throw new TypeError( "Invalid fallback type" );
                }
            }
        }
    };
    
    (function() {
        try {
            var a = new Uint16Array(1),
                b;
                
            a[0] = 0xFF00;
            b = new Uint8Array(a.buffer);
            if( b[0] === 0 ) {
                MACHINE_ENDIANESS = LITTLE_ENDIAN;
            }
            else {
                MACHINE_ENDIANESS = BIG_ENDIAN;
            }
        }
        catch(e) {
            MACHINE_ENDIANESS = LITTLE_ENDIAN;
        }
    
    })();

    var ByteArray;
    
    function arrayByteAt(i) {
        if( i >= this.length ) {
            return NaN;
        }
        var ret = this[i];
        if( ! ( 0x00 <= ret && ret <= 0xFF ) ) {
            throw new DecoderError( "Invalid byte value " + ret );
        }
        return ret;
    };
    
    try {
        ByteArray = Uint8Array;
        ByteArray.prototype.charCodeAt = function(i) {
                return i >= this.length ? NaN : this[i];
        };
        Array.prototype.charCodeAt = arrayByteAt;
    }
    catch(e) {
        ByteArray = [].constructor;
        ByteArray.prototype.charCodeAt = arrayByteAt;
    }
    

    
    unicode.MACHINE_ENDIANESS = MACHINE_ENDIANESS;

    //String.fromCharCode that works for astral planes
    unicode.from = function( fromCharCode ) {
 
        return function() {
            var i,
                len = arguments.length,
                num,
                args = [];

            for( i = 0; i < len; ++i ) {
                num = +arguments[i];

                if( !isCodePoint( num ) ) {
                    throw new DecoderError( "Invalid codepoint");
                }
                else if( num >= 0x0000 && num <= 0xD7FF ||
                         num >= 0xE000 && num <= 0xFFFF ) {
                    args.push( num );
                }
                else if( num >= 0x10000 && num <= 0x10FFFF ) {
                    num -= 0x10000;
                    args.push( 
                        0xD800 + ( ( num & 0xFFC00 ) >>> 10 ),
                        0xDC00 + ( num & 0x3FF )
                    );
                }
                else {
                    args.push( 0xFFFD );
                }
            }

            return fromCharCode.apply( String, args );
        };

    }(String.fromCharCode);
    
    //String.prototype.charCodeAt that works for astral planes
    //Return -1 for valid low surrogate
    //Return astral codepoint for valid high surrogate
    //Return 0xfffd for invalid/unpaired surrogates
    //Return NaN if index out of bounds
    //Return BMP codepoint otherwise
    
    //TODO make return values make more sense
    unicode.at = function( charCodeAt ) {
        return function( str, num ) {
            var idx = +num,
                code,
                low,
                high;

            if( idx >= str.length ) {
                return NaN;
            }

            high = code = charCodeAt.call( str, idx );

            if( isHighSurrogate( code ) ) {

                low = charCodeAt.call( str, idx+1 );

                if( !isLowSurrogate(low) ) {
                    return 0xFFFD;
                }
                return ((high - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000; 
            }
            else if( isLowSurrogate(code) ) {
                if( idx < 1 ) {
                    return 0xFFFD;
                }
                else {
                    high = charCodeAt.call( str, idx-1 );
                    if( isHighSurrogate( high ) ) {
                        return -1;
                    }
                    else {
                        return 0xFFFD;
                    }
                }
            }
            else {
                return code;
            }
        };
     }( String.prototype.charCodeAt );


    function make8BitCharset( map, propName, name ) {
            var unicodeMap = {},
                l = 256,
                aliases;

            while( l-- ) {
                unicodeMap[map[l]] = l;
            }

            unicode["to" + propName] = function( str, fallback ) {
                fallback = checkFallback(fallback);
                var i = 0, 
                    codePoint,
                    code,
                    ret = [];

                loop: while( !isNaN( codePoint = unicode.at( str, i++) ) ) {
                    if( codePoint < 0 ) {
                        continue;
                    }
                    code = +unicodeMap[codePoint];

                    if( isNaN( code ) || codePoint === 0xFFFD ) {
                        code = getEncoderErrorCodePoint( fallback );
                        if( code < 0 ) {
                            continue;
                        }
                    }
                    ret.push( String.fromCharCode( code ) );
                }

                return ret.join(""); 
            };

            unicode["from" + propName] = function( str, fallback ) {
                str = checkBinary(str);
                fallback = checkFallback(fallback);
                var codePoints = [],
                    i = 0, len = str.length;

                for( i = 0; i < len; i++ ) {
                    checkDecodedCodePoint( map[str.charCodeAt(i)], codePoints, fallback );
                }

                return unicode.from.apply( String, codePoints );
            };
            
            aliases = [].slice.call( arguments, 3 );
            l = aliases.length;
            
            while(l--) {
                unicode["to"+aliases[l]] = unicode["to" + propName];
                unicode["from"+aliases[l]] = unicode["from" + propName];
            }
    }
    
    make8BitCharset( ascii.concat([
        0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
        0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
        0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
        0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
        0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
        0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
        0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
        0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD
    ]), "ASCII", "ASCII", "USASCII");
    

    
    make8BitCharset( ascii.concat([
        0x0106,0x00FC,0x00E9,0x0101,0x00E4,0x0123,0x00E5,0x0107,0x0142,0x0113,0x0156,0x0157,0x012B,0x0179,0x00C4,0x00C5
        ,0x00C9,0x00E6,0x00C6,0x014D,0x00F6,0x0122,0x00A2,0x015A,0x015B,0x00D6,0x00DC,0x00F8,0x00A3,0x00D8,0x00D7,0x00A4
        ,0x0100,0x012A,0x00F3,0x017B,0x017C,0x017A,0x201D,0x00A6,0x00A9,0x00AE,0x00AC,0x00BD,0x00BC,0x0141,0x00AB,0x00BB
        ,0x2591,0x2592,0x2593,0x2502,0x2524,0x0104,0x010C,0x0118,0x0116,0x2563,0x2551,0x2557,0x255D,0x012E,0x0160,0x2510
        ,0x2514,0x2534,0x252C,0x251C,0x2500,0x253C,0x0172,0x016A,0x255A,0x2554,0x2569,0x2566,0x2560,0x2550,0x256C,0x017D
        ,0x0105,0x010D,0x0119,0x0117,0x012F,0x0161,0x0173,0x016B,0x017E,0x2518,0x250C,0x2588,0x2584,0x258C,0x2590,0x2580
        ,0x00D3,0x00DF,0x014C,0x0143,0x00F5,0x00D5,0x00B5,0x0144,0x0136,0x0137,0x013B,0x013C,0x0146,0x0112,0x0145,0x2019
        ,0x00AD,0x00B1,0x201C,0x00BE,0x00B6,0x00A7,0x00F7,0x201E,0x00B0,0x2219,0x00B7,0x00B9,0x00B3,0x00B2,0x25A0,0x00A0
    ]), "CP775", "CP775", "OEM775", "MsDosBalticRim");
    
    make8BitCharset( ascii.concat([
         0x00C7,0x00FC,0x00E9,0x00E2,0x00E4,0x00E0,0x00E5,0x00E7,0x00EA,0x00EB,0x00E8,0x00EF,0x00EE,0x00EC,0x00C4,0x00C5
        ,0x00C9,0x00E6,0x00C6,0x00F4,0x00F6,0x00F2,0x00FB,0x00F9,0x00FF,0x00D6,0x00DC,0x00F8,0x00A3,0x00D8,0x00D7,0x0192
        ,0x00E1,0x00ED,0x00F3,0x00FA,0x00F1,0x00D1,0x00AA,0x00BA,0x00BF,0x00AE,0x00AC,0x00BD,0x00BC,0x00A1,0x00AB,0x00BB
        ,0x2591,0x2592,0x2593,0x2502,0x2524,0x00C1,0x00C2,0x00C0,0x00A9,0x2563,0x2551,0x2557,0x255D,0x00A2,0x00A5,0x2510
        ,0x2514,0x2534,0x252C,0x251C,0x2500,0x253C,0x00E3,0x00C3,0x255A,0x2554,0x2569,0x2566,0x2560,0x2550,0x256C,0x00A4
        ,0x00F0,0x00D0,0x00CA,0x00CB,0x00C8,0x0131,0x00CD,0x00CE,0x00CF,0x2518,0x250C,0x2588,0x2584,0x00A6,0x00CC,0x2580
        ,0x00D3,0x00DF,0x00D4,0x00D2,0x00F5,0x00D5,0x00B5,0x00FE,0x00DE,0x00DA,0x00DB,0x00D9,0x00FD,0x00DD,0x00AF,0x00B4
        ,0x00AD,0x00B1,0x2017,0x00BE,0x00B6,0x00A7,0x00F7,0x00B8,0x00B0,0x00A8,0x00B7,0x00B9,0x00B3,0x00B2,0x25A0,0x00A0
    ]), "CP850", "CP850", "OEM850", "MsDosLatin1" );
    
    make8BitCharset([
        0x0000,0x0001,0x0002,0x0003,0x0004,0x0005,0x0006,0x0007,0x0008,0x0009,0x000A,0x000B,0x000C,0x000D,0x000E,0x000F
        ,0x0010,0x0011,0x0012,0x0013,0x0014,0x0015,0x0016,0x0017,0x0018,0x0019,0x001A,0x001B,0x001C,0x001D,0x001E,0x001F
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0x007F
        ,0x00C7,0x00FC,0x00E9,0x00E2,0x00E4,0x00E0,0x00E5,0x00E7,0x00EA,0x00EB,0x00E8,0x00EF,0x00EE,0x00EC,0x00C4,0x00C5
        ,0x00C9,0x00E6,0x00C6,0x00F4,0x00F6,0x00F2,0x00FB,0x00F9,0x00FF,0x00D6,0x00DC,0x00A2,0x00A3,0x00A5,0x20A7,0x0192
        ,0x00E1,0x00ED,0x00F3,0x00FA,0x00F1,0x00D1,0x00AA,0x00BA,0x00BF,0x2310,0x00AC,0x00BD,0x00BC,0x00A1,0x00AB,0x00BB
        ,0x2591,0x2592,0x2593,0x2502,0x2524,0x2561,0x2562,0x2556,0x2555,0x2563,0x2551,0x2557,0x255D,0x255C,0x255B,0x2510
        ,0x2514,0x2534,0x252C,0x251C,0x2500,0x253C,0x255E,0x255F,0x255A,0x2554,0x2569,0x2566,0x2560,0x2550,0x256C,0x2567
        ,0x2568,0x2564,0x2565,0x2559,0x2558,0x2552,0x2553,0x256B,0x256A,0x2518,0x250C,0x2588,0x2584,0x258C,0x2590,0x2580
        ,0x03B1,0x00DF,0x0393,0x03C0,0x03A3,0x03C3,0x00B5,0x03C4,0x03A6,0x0398,0x03A9,0x03B4,0x221E,0x03C6,0x03B5,0x2229
        ,0x2261,0x00B1,0x2265,0x2264,0x2320,0x2321,0x00F7,0x2248,0x00B0,0x2219,0x00B7,0x221A,0x207F,0x00B2,0x25A0,0x00A0
    ], "CP437", "CP437", "MsDosLatinUs", "OEM437" );
    
    make8BitCharset( [
        0x0000,0x0001,0x0002,0x0003,0x0004,0x0005,0x0006,0x0007,0x0008,0x0009,0x000A,0x000B,0x000C,0x000D,0x000E,0x000F
        ,0x0010,0x0011,0x0012,0x0013,0x0014,0x0015,0x0016,0x0017,0x0018,0x0019,0x001A,0x001B,0x001C,0x001D,0x001E,0x001F
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0x007F
        ,0x00C4,0x00C5,0x00C7,0x00C9,0x00D1,0x00D6,0x00DC,0x00E1,0x00E0,0x00E2,0x00E4,0x00E3,0x00E5,0x00E7,0x00E9,0x00E8
        ,0x00EA,0x00EB,0x00ED,0x00EC,0x00EE,0x00EF,0x00F1,0x00F3,0x00F2,0x00F4,0x00F6,0x00F5,0x00FA,0x00F9,0x00FB,0x00FC
        ,0x2020,0x00B0,0x00A2,0x00A3,0x00A7,0x2022,0x00B6,0x00DF,0x00AE,0x00A9,0x2122,0x00B4,0x00A8,0x2260,0x00C6,0x00D8
        ,0x221E,0x00B1,0x2264,0x2265,0x00A5,0x00B5,0x2202,0x2211,0x220F,0x03C0,0x222B,0x00AA,0x00BA,0x03A9,0x00E6,0x00F8
        ,0x00BF,0x00A1,0x00AC,0x221A,0x0192,0x2248,0x2206,0x00AB,0x00BB,0x2026,0x00A0,0x00C0,0x00C3,0x00D5,0x0152,0x0153
        ,0x2013,0x2014,0x201C,0x201D,0x2018,0x2019,0x00F7,0x25CA,0x00FF,0x0178,0x2044,0x20AC,0x2039,0x203A,0xFB01,0xFB02
        ,0x2021,0x00B7,0x201A,0x201E,0x2030,0x00C2,0x00CA,0x00C1,0x00CB,0x00C8,0x00CD,0x00CE,0x00CF,0x00CC,0x00D3,0x00D4
        ,0xF8FF,0x00D2,0x00DA,0x00DB,0x00D9,0x0131,0x02C6,0x02DC,0x00AF,0x02D8,0x02D9,0x02DA,0x00B8,0x02DD,0x02DB,0x02C7
    ], "MacOsRoman", "Mac OS Roman" );

    make8BitCharset( ascii.concat([
        0x00C4,0x0100,0x0101,0x00C9,0x0104,0x00D6,0x00DC,0x00E1,0x0105,0x010C,0x00E4,0x010D,0x0106,0x0107,0x00E9,0x0179
        ,0x017A,0x010E,0x00ED,0x010F,0x0112,0x0113,0x0116,0x00F3,0x0117,0x00F4,0x00F6,0x00F5,0x00FA,0x011A,0x011B,0x00FC
        ,0x2020,0x00B0,0x0118,0x00A3,0x00A7,0x2022,0x00B6,0x00DF,0x00AE,0x00A9,0x2122,0x0119,0x00A8,0x2260,0x0123,0x012E
        ,0x012F,0x012A,0x2264,0x2265,0x012B,0x0136,0x2202,0x2211,0x0142,0x013B,0x013C,0x013D,0x013E,0x0139,0x013A,0x0145
        ,0x0146,0x0143,0x00AC,0x221A,0x0144,0x0147,0x2206,0x00AB,0x00BB,0x2026,0x00A0,0x0148,0x0150,0x00D5,0x0151,0x014C
        ,0x2013,0x2014,0x201C,0x201D,0x2018,0x2019,0x00F7,0x25CA,0x014D,0x0154,0x0155,0x0158,0x2039,0x203A,0x0159,0x0156
        ,0x0157,0x0160,0x201A,0x201E,0x0161,0x015A,0x015B,0x00C1,0x0164,0x0165,0x00CD,0x017D,0x017E,0x016A,0x00D3,0x00D4
        ,0x016B,0x016E,0x00DA,0x016F,0x0170,0x0171,0x0172,0x0173,0x00DD,0x00FD,0x0137,0x017B,0x0141,0x017C,0x0122,0x02C7
    ]), "MacOsCentEur", "Mac Os Central European" );
    
    make8BitCharset( ascii.concat([
        0x00C7,0x00FC,0x00E9,0x00E2,0x00E4,0x00E0,0x0105,0x00E7,0x00EA,0x00EB,0x00E8,0x00EF,0x00EE,0x0107,0x00C4,0x0104
        ,0x0118,0x0119,0x0142,0x00F4,0x00F6,0x0106,0x00FB,0x00F9,0x015A,0x00D6,0x00DC,0x00A2,0x0141,0x00A5,0x015B,0x0192
        ,0x0179,0x017B,0x00F3,0x00D3,0x0144,0x0143,0x017A,0x017C,0x00BF,0x2310,0x00AC,0x00BD,0x00BC,0x00A1,0x00AB,0x00BB
        ,0x2591,0x2592,0x2593,0x2502,0x2524,0x2561,0x2562,0x2556,0x2555,0x2563,0x2551,0x2557,0x255D,0x255C,0x255B,0x2510
        ,0x2514,0x2534,0x252C,0x251C,0x2500,0x253C,0x255E,0x255F,0x255A,0x2554,0x2569,0x2566,0x2560,0x2550,0x256C,0x2567
        ,0x2568,0x2564,0x2565,0x2559,0x2558,0x2552,0x2553,0x256B,0x256A,0x2518,0x250C,0x2588,0x2584,0x258C,0x2590,0x2580
        ,0x03B1,0x00DF,0x0393,0x03C0,0x03A3,0x03C3,0x00B5,0x03C4,0x03A6,0x0398,0x03A9,0x03B4,0x221E,0x03C6,0x03B5,0x2229
        ,0x2261,0x00B1,0x2265,0x2264,0x2320,0x2321,0x00F7,0x2248,0x00B0,0x2219,0x00B7,0x221A,0x207F,0x00B2,0x25A0,0x00A0
    ]), "Mazovia", "Mazovia");
    
    make8BitCharset( ascii.concat([
        0x20AC,0xFFFD,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0x02C6,0x2030,0xFFFD,0x2039,0x0152,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x02DC,0x2122,0xFFFD,0x203A,0x0153,0xFFFD,0xFFFD,0x0178
        ,0x00A0,0x00A1,0x00A2,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0x00AA,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x00B9,0x00BA,0x00BB,0x00BC,0x00BD,0x00BE,0x00BF
        ,0x00C0,0x00C1,0x00C2,0x0102,0x00C4,0x00C5,0x00C6,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x0300,0x00CD,0x00CE,0x00CF
        ,0x0110,0x00D1,0x0309,0x00D3,0x00D4,0x01A0,0x00D6,0x00D7,0x00D8,0x00D9,0x00DA,0x00DB,0x00DC,0x01AF,0x0303,0x00DF
        ,0x00E0,0x00E1,0x00E2,0x0103,0x00E4,0x00E5,0x00E6,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x0301,0x00ED,0x00EE,0x00EF
        ,0x0111,0x00F1,0x0323,0x00F3,0x00F4,0x01A1,0x00F6,0x00F7,0x00F8,0x00F9,0x00FA,0x00FB,0x00FC,0x01B0,0x20AB,0x00FF
    ]), "Windows1258", "Windows-1258" );

    make8BitCharset( [
        0x0000,0x0001,0x0002,0x0003,0x0004,0x0005,0x0006,0x0007,0x0008,0x0009,0x000A,0x000B,0x000C,0x000D,0x000E,0x000F
        ,0x0010,0x0011,0x0012,0x0013,0x0014,0x0015,0x0016,0x0017,0x0018,0x0019,0x001A,0x001B,0x001C,0x001D,0x001E,0x001F
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0x007F
        ,0x20AC,0xFFFD,0x201A,0xFFFD,0x201E,0x2026,0x2020,0x2021,0xFFFD,0x2030,0xFFFD,0x2039,0xFFFD,0x00A8,0x02C7,0x00B8
        ,0xFFFD,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0xFFFD,0x2122,0xFFFD,0x203A,0xFFFD,0x00AF,0x02DB,0xFFFD
        ,0x00A0,0xFFFD,0x00A2,0x00A3,0x00A4,0xFFFD,0x00A6,0x00A7,0x00D8,0x00A9,0x0156,0x00AB,0x00AC,0x00AD,0x00AE,0x00C6
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00F8,0x00B9,0x0157,0x00BB,0x00BC,0x00BD,0x00BE,0x00E6
        ,0x0104,0x012E,0x0100,0x0106,0x00C4,0x00C5,0x0118,0x0112,0x010C,0x00C9,0x0179,0x0116,0x0122,0x0136,0x012A,0x013B
        ,0x0160,0x0143,0x0145,0x00D3,0x014C,0x00D5,0x00D6,0x00D7,0x0172,0x0141,0x015A,0x016A,0x00DC,0x017B,0x017D,0x00DF
        ,0x0105,0x012F,0x0101,0x0107,0x00E4,0x00E5,0x0119,0x0113,0x010D,0x00E9,0x017A,0x0117,0x0123,0x0137,0x012B,0x013C
        ,0x0161,0x0144,0x0146,0x00F3,0x014D,0x00F5,0x00F6,0x00F7,0x0173,0x0142,0x015B,0x016B,0x00FC,0x017C,0x017E,0x02D9
    ], "Windows1257", "Windows-1257" );
    
    make8BitCharset( ascii.concat([
        0x20AC,0x067E,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0x02C6,0x2030,0x0679,0x2039,0x0152,0x0686,0x0698,0x0688
        ,0x06AF,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x06A9,0x2122,0x0691,0x203A,0x0153,0x200C,0x200D,0x06BA
        ,0x00A0,0x060C,0x00A2,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0x06BE,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x00B9,0x061B,0x00BB,0x00BC,0x00BD,0x00BE,0x061F
        ,0x06C1,0x0621,0x0622,0x0623,0x0624,0x0625,0x0626,0x0627,0x0628,0x0629,0x062A,0x062B,0x062C,0x062D,0x062E,0x062F
        ,0x0630,0x0631,0x0632,0x0633,0x0634,0x0635,0x0636,0x00D7,0x0637,0x0638,0x0639,0x063A,0x0640,0x0641,0x0642,0x0643
        ,0x00E0,0x0644,0x00E2,0x0645,0x0646,0x0647,0x0648,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x0649,0x064A,0x00EE,0x00EF
        ,0x064B,0x064C,0x064D,0x064E,0x00F4,0x064F,0x0650,0x00F7,0x0651,0x00F9,0x0652,0x00FB,0x00FC,0x200E,0x200F,0x06D2
    ]), "Windows1256", "Windows-1256" );
    
    make8BitCharset( ascii.concat([
        0x20AC,0xFFFD,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0xFFFD,0x2030,0xFFFD,0x2039,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x02DC,0x2122,0xFFFD,0x203A,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x00A1,0x00A2,0x00A3,0x20AA,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0x00D7,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x00B9,0x00F7,0x00BB,0x00BC,0x00BD,0x00BE,0x00BF
        ,0x05B0,0x05B1,0x05B2,0x05B3,0x05B4,0x05B5,0x05B6,0x05B7,0x05B8,0x05B9,0xFFFD,0x05BB,0x05BC,0x05BD,0x05BE,0x05BF
        ,0x05C0,0x05C1,0x05C2,0x05C3,0x05F0,0x05F1,0x05F2,0x05F3,0x05F4,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x05D0,0x05D1,0x05D2,0x05D3,0x05D4,0x05D5,0x05D6,0x05D7,0x05D8,0x05D9,0x05DA,0x05DB,0x05DC,0x05DD,0x05DE,0x05DF
        ,0x05E0,0x05E1,0x05E2,0x05E3,0x05E4,0x05E5,0x05E6,0x05E7,0x05E8,0x05E9,0x05EA,0xFFFD,0xFFFD,0x200E,0x200F,0xFFFD
    ]), "Windows1255", "Windows-1255" );

    make8BitCharset( ascii.concat([
        0x20AC,0xFFFD,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0x02C6,0x2030,0x0160,0x2039,0x0152,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x02DC,0x2122,0x0161,0x203A,0x0153,0xFFFD,0xFFFD,0x0178
        ,0x00A0,0x00A1,0x00A2,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0x00AA,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x00B9,0x00BA,0x00BB,0x00BC,0x00BD,0x00BE,0x00BF
        ,0x00C0,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF
        ,0x011E,0x00D1,0x00D2,0x00D3,0x00D4,0x00D5,0x00D6,0x00D7,0x00D8,0x00D9,0x00DA,0x00DB,0x00DC,0x0130,0x015E,0x00DF
        ,0x00E0,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF
        ,0x011F,0x00F1,0x00F2,0x00F3,0x00F4,0x00F5,0x00F6,0x00F7,0x00F8,0x00F9,0x00FA,0x00FB,0x00FC,0x0131,0x015F,0x00FF
    ]), "Windows1254", "Windows-1254" );
    
    make8BitCharset( ascii.concat([
        0x20AC,0xFFFD,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0xFFFD,0x2030,0xFFFD,0x2039,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0xFFFD,0x2122,0xFFFD,0x203A,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x0385,0x0386,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0xFFFD,0x00AB,0x00AC,0x00AD,0x00AE,0x2015
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x0384,0x00B5,0x00B6,0x00B7,0x0388,0x0389,0x038A,0x00BB,0x038C,0x00BD,0x038E,0x038F
        ,0x0390,0x0391,0x0392,0x0393,0x0394,0x0395,0x0396,0x0397,0x0398,0x0399,0x039A,0x039B,0x039C,0x039D,0x039E,0x039F
        ,0x03A0,0x03A1,0xFFFD,0x03A3,0x03A4,0x03A5,0x03A6,0x03A7,0x03A8,0x03A9,0x03AA,0x03AB,0x03AC,0x03AD,0x03AE,0x03AF
        ,0x03B0,0x03B1,0x03B2,0x03B3,0x03B4,0x03B5,0x03B6,0x03B7,0x03B8,0x03B9,0x03BA,0x03BB,0x03BC,0x03BD,0x03BE,0x03BF
        ,0x03C0,0x03C1,0x03C2,0x03C3,0x03C4,0x03C5,0x03C6,0x03C7,0x03C8,0x03C9,0x03CA,0x03CB,0x03CC,0x03CD,0x03CE,0xFFFD
    ]), "Windows1253", "Windows-1253" );

    make8BitCharset( ascii.concat([
        0x20AC,0xFFFD,0x201A,0x0192,0x201E,0x2026,0x2020,0x2021,0x02C6,0x2030,0x0160,0x2039,0x0152,0xFFFD,0x017D,0xFFFD
        ,0xFFFD,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x02DC,0x2122,0x0161,0x203A,0x0153,0xFFFD,0x017E,0x0178
        ,0x00A0,0x00A1,0x00A2,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0x00AA,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x00B9,0x00BA,0x00BB,0x00BC,0x00BD,0x00BE,0x00BF
        ,0x00C0,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF
        ,0x00D0,0x00D1,0x00D2,0x00D3,0x00D4,0x00D5,0x00D6,0x00D7,0x00D8,0x00D9,0x00DA,0x00DB,0x00DC,0x00DD,0x00DE,0x00DF
        ,0x00E0,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF
        ,0x00F0,0x00F1,0x00F2,0x00F3,0x00F4,0x00F5,0x00F6,0x00F7,0x00F8,0x00F9,0x00FA,0x00FB,0x00FC,0x00FD,0x00FE,0x00FF
    ]), "Windows1252", "Windows-1252" );

    make8BitCharset( ascii.concat([
        0x0402,0x0403,0x201A,0x0453,0x201E,0x2026,0x2020,0x2021,0x20AC,0x2030,0x0409,0x2039,0x040A,0x040C,0x040B,0x040F,
        0x0452,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0xFFFD,0x2122,0x0459,0x203A,0x045A,0x045C,0x045B,0x045F,
        0x00A0,0x040E,0x045E,0x0408,0x00A4,0x0490,0x00A6,0x00A7,0x0401,0x00A9,0x0404,0x00AB,0x00AC,0x00AD,0x00AE,0x0407,
        0x00B0,0x00B1,0x0406,0x0456,0x0491,0x00B5,0x00B6,0x00B7,0x0451,0x2116,0x0454,0x00BB,0x0458,0x0405,0x0455,0x0457,
        0x0410,0x0411,0x0412,0x0413,0x0414,0x0415,0x0416,0x0417,0x0418,0x0419,0x041A,0x041B,0x041C,0x041D,0x041E,0x041F,
        0x0420,0x0421,0x0422,0x0423,0x0424,0x0425,0x0426,0x0427,0x0428,0x0429,0x042A,0x042B,0x042C,0x042D,0x042E,0x042F,
        0x0430,0x0431,0x0432,0x0433,0x0434,0x0435,0x0436,0x0437,0x0438,0x0439,0x043A,0x043B,0x043C,0x043D,0x043E,0x043F,
        0x0440,0x0441,0x0442,0x0443,0x0444,0x0445,0x0446,0x0447,0x0448,0x0449,0x044A,0x044B,0x044C,0x044D,0x044E,0x044F
    ]), "Windows1251", "Windows-1251" );
    
    make8BitCharset( ascii.concat([
        0x20AC,0xFFFD,0x201A,0xFFFD,0x201E,0x2026,0x2020,0x2021,0xFFFD,0x2030,0x0160,0x2039,0x015A,0x0164,0x017D,0x0179
        ,0xFFFD,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0xFFFD,0x2122,0x0161,0x203A,0x015B,0x0165,0x017E,0x017A
        ,0x00A0,0x02C7,0x02D8,0x0141,0x00A4,0x0104,0x00A6,0x00A7,0x00A8,0x00A9,0x015E,0x00AB,0x00AC,0x00AD,0x00AE,0x017B
        ,0x00B0,0x00B1,0x02DB,0x0142,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x0105,0x015F,0x00BB,0x013D,0x02DD,0x013E,0x017C
        ,0x0154,0x00C1,0x00C2,0x0102,0x00C4,0x0139,0x0106,0x00C7,0x010C,0x00C9,0x0118,0x00CB,0x011A,0x00CD,0x00CE,0x010E
        ,0x0110,0x0143,0x0147,0x00D3,0x00D4,0x0150,0x00D6,0x00D7,0x0158,0x016E,0x00DA,0x0170,0x00DC,0x00DD,0x0162,0x00DF
        ,0x0155,0x00E1,0x00E2,0x0103,0x00E4,0x013A,0x0107,0x00E7,0x010D,0x00E9,0x0119,0x00EB,0x011B,0x00ED,0x00EE,0x010F
        ,0x0111,0x0144,0x0148,0x00F3,0x00F4,0x0151,0x00F6,0x00F7,0x0159,0x016F,0x00FA,0x0171,0x00FC,0x00FD,0x0163,0x02D9
    ]), "Windows1250", "Windows-1250" );    


    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,
        0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F,
        0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F,
        0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F,
        0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F,
        0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F,
        0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD,
        0x2500,0x2502,0x250C,0x2510,0x2514,0x2518,0x251C,0x2524,0x252C,0x2534,0x253C,0x2580,0x2584,0x2588,0x258C,0x2590,
        0x2591,0x2592,0x2593,0x2320,0x25A0,0x2219,0x221A,0x2248,0x2264,0x2265,0x00A0,0x2321,0x00B0,0x00B2,0x00B7,0x00F7,
        0x2550,0x2551,0x2552,0x0451,0x2553,0x2554,0x2555,0x2556,0x2557,0x2558,0x2559,0x255A,0x255B,0x255C,0x255D,0x255E,
        0x255F,0x2560,0x2561,0x0401,0x2562,0x2563,0x2564,0x2565,0x2566,0x2567,0x2568,0x2569,0x256A,0x256B,0x256C,0x00A9,
        0x044E,0x0430,0x0431,0x0446,0x0434,0x0435,0x0444,0x0433,0x0445,0x0438,0x0439,0x043A,0x043B,0x043C,0x043D,0x043E,
        0x043F,0x044F,0x0440,0x0441,0x0442,0x0443,0x0436,0x0432,0x044C,0x044B,0x0437,0x0448,0x044D,0x0449,0x0447,0x044A,
        0x042E,0x0410,0x0411,0x0426,0x0414,0x0415,0x0424,0x0413,0x0425,0x0418,0x0419,0x041A,0x041B,0x041C,0x041D,0x041E,
        0x041F,0x042F,0x0420,0x0421,0x0422,0x0423,0x0416,0x0412,0x042C,0x042B,0x0417,0x0428,0x042D,0x0429,0x0427,0x042A
    ], "KOI8R", "KOI8-R" );
    
    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0x2500,0x2502,0x250C,0x2510,0x2514,0x2518,0x251C,0x2524,0x252C,0x2534,0x253C,0x2580,0x2584,0x2588,0x258C,0x2590
        ,0x2591,0x2592,0x2593,0x2320,0x25A0,0x2219,0x221A,0x2248,0x2264,0x2265,0x00A0,0x2321,0x00B0,0x00B2,0x00B7,0x00F7
        ,0x2550,0x2551,0x2552,0x0451,0x0454,0x2554,0x0456,0x0457,0x2557,0x2558,0x2559,0x255A,0x255B,0x0491,0x255D,0x255E
        ,0x255F,0x2560,0x2561,0x0401,0x0404,0x2563,0x0406,0x0407,0x2566,0x2567,0x2568,0x2569,0x256A,0x0490,0x256C,0x00A9
        ,0x044E,0x0430,0x0431,0x0446,0x0434,0x0435,0x0444,0x0433,0x0445,0x0438,0x0439,0x043A,0x043B,0x043C,0x043D,0x043E
        ,0x043F,0x044F,0x0440,0x0441,0x0442,0x0443,0x0436,0x0432,0x044C,0x044B,0x0437,0x0448,0x044D,0x0449,0x0447,0x044A
        ,0x042E,0x0410,0x0411,0x0426,0x0414,0x0415,0x0424,0x0413,0x0425,0x0418,0x0419,0x041A,0x041B,0x041C,0x041D,0x041E
        ,0x041F,0x042F,0x0420,0x0421,0x0422,0x0423,0x0416,0x0412,0x042C,0x042B,0x0417,0x0428,0x042D,0x0429,0x0427,0x042A
    ], "KOI8U", "KOI8-U" );
    
    make8BitCharset( [
        0x0000,0x0001,0x0002,0x0003,0x0004,0x0005,0x0006,0x0007,0x0008,0x0009,0x000A,0x000B,0x000C,0x000D,0x000E,0x000F
        ,0x0010,0x0011,0x0012,0x0013,0x0014,0x0015,0x0016,0x0017,0x0018,0x0019,0x001A,0x001B,0x001C,0x001D,0x001E,0x001F
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0x007F
        ,0x0410,0x0411,0x0412,0x0413,0x0414,0x0415,0x0416,0x0417,0x0418,0x0419,0x041A,0x041B,0x041C,0x041D,0x041E,0x041F
        ,0x0420,0x0421,0x0422,0x0423,0x0424,0x0425,0x0426,0x0427,0x0428,0x0429,0x042A,0x042B,0x042C,0x042D,0x042E,0x042F
        ,0x0430,0x0431,0x0432,0x0433,0x0434,0x0435,0x0436,0x0437,0x0438,0x0439,0x043A,0x043B,0x043C,0x043D,0x043E,0x043F
        ,0x2591,0x2592,0x2593,0x2502,0x2524,0x2561,0x2562,0x2556,0x2555,0x2563,0x2551,0x2557,0x255D,0x255C,0x255B,0x2510
        ,0x2514,0x2534,0x252C,0x251C,0x2500,0x253C,0x255E,0x255F,0x255A,0x2554,0x2569,0x2566,0x2560,0x2550,0x256C,0x2567
        ,0x2568,0x2564,0x2565,0x2559,0x2558,0x2552,0x2553,0x256B,0x256A,0x2518,0x250C,0x2588,0x2584,0x258C,0x2590,0x2580
        ,0x0440,0x0441,0x0442,0x0443,0x0444,0x0445,0x0446,0x0447,0x0448,0x0449,0x044A,0x044B,0x044C,0x044D,0x044E,0x044F
        ,0x0401,0x0451,0x0404,0x0454,0x0407,0x0457,0x040E,0x045E,0x00B0,0x2219,0x00B7,0x221A,0x2116,0x00A4,0x25A0,0x00A0
    ], "CP866", "Code Page 866" );

    make8BitCharset( [
        0x0000,0x0001,0x0002,0x0003,0x0004,0x0005,0x0006,0x0007,0x0008,0x0009,0x000A,0x000B,0x000C,0x000D,0x000E,0x000F
        ,0x0010,0x0011,0x0012,0x0013,0x0014,0x0015,0x0016,0x0017,0x0018,0x0019,0x001A,0x001B,0x001C,0x001D,0x001E,0x001F
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0x007F
        ,0x0080,0x0081,0x0082,0x0083,0x0084,0x0085,0x0086,0x0087,0x0088,0x0089,0x008A,0x008B,0x008C,0x008D,0x008E,0x008F
        ,0x0090,0x0091,0x0092,0x0093,0x0094,0x0095,0x0096,0x0097,0x0098,0x0099,0x009A,0x009B,0x009C,0x009D,0x009E,0x009F
        ,0x00A0,0x00A1,0x00A2,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0x00AA,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x00B9,0x00BA,0x00BB,0x00BC,0x00BD,0x00BE,0x00BF
        ,0x00C0,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF
        ,0x00D0,0x00D1,0x00D2,0x00D3,0x00D4,0x00D5,0x00D6,0x00D7,0x00D8,0x00D9,0x00DA,0x00DB,0x00DC,0x00DD,0x00DE,0x00DF
        ,0x00E0,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF
        ,0x00F0,0x00F1,0x00F2,0x00F3,0x00F4,0x00F5,0x00F6,0x00F7,0x00F8,0x00F9,0x00FA,0x00FB,0x00FC,0x00FD,0x00FE,0x00FF
    ], "ISO88591", "ISO-8859-1", "Latin1" );    


    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x0104,0x02D8,0x0141,0x00A4,0x013D,0x015A,0x00A7,0x00A8,0x0160,0x015E,0x0164,0x0179,0x00AD,0x017D,0x017B
        ,0x00B0,0x0105,0x02DB,0x0142,0x00B4,0x013E,0x015B,0x02C7,0x00B8,0x0161,0x015F,0x0165,0x017A,0x02DD,0x017E,0x017C
        ,0x0154,0x00C1,0x00C2,0x0102,0x00C4,0x0139,0x0106,0x00C7,0x010C,0x00C9,0x0118,0x00CB,0x011A,0x00CD,0x00CE,0x010E
        ,0x0110,0x0143,0x0147,0x00D3,0x00D4,0x0150,0x00D6,0x00D7,0x0158,0x016E,0x00DA,0x0170,0x00DC,0x00DD,0x0162,0x00DF
        ,0x0155,0x00E1,0x00E2,0x0103,0x00E4,0x013A,0x0107,0x00E7,0x010D,0x00E9,0x0119,0x00EB,0x011B,0x00ED,0x00EE,0x010F
        ,0x0111,0x0144,0x0148,0x00F3,0x00F4,0x0151,0x00F6,0x00F7,0x0159,0x016F,0x00FA,0x0171,0x00FC,0x00FD,0x0163,0x02D9
    ], "ISO88592", "ISO-8859-2", "Latin2" );
    
    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x0126,0x02D8,0x00A3,0x00A4,0xFFFD,0x0124,0x00A7,0x00A8,0x0130,0x015E,0x011E,0x0134,0x00AD,0xFFFD,0x017B
        ,0x00B0,0x0127,0x00B2,0x00B3,0x00B4,0x00B5,0x0125,0x00B7,0x00B8,0x0131,0x015F,0x011F,0x0135,0x00BD,0xFFFD,0x017C
        ,0x00C0,0x00C1,0x00C2,0xFFFD,0x00C4,0x010A,0x0108,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF
        ,0xFFFD,0x00D1,0x00D2,0x00D3,0x00D4,0x0120,0x00D6,0x00D7,0x011C,0x00D9,0x00DA,0x00DB,0x00DC,0x016C,0x015C,0x00DF
        ,0x00E0,0x00E1,0x00E2,0xFFFD,0x00E4,0x010B,0x0109,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF
        ,0xFFFD,0x00F1,0x00F2,0x00F3,0x00F4,0x0121,0x00F6,0x00F7,0x011D,0x00F9,0x00FA,0x00FB,0x00FC,0x016D,0x015D,0x02D9
    ], "ISO88593", "ISO-8859-3", "Latin3" );
    
    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x0104,0x0138,0x0156,0x00A4,0x0128,0x013B,0x00A7,0x00A8,0x0160,0x0112,0x0122,0x0166,0x00AD,0x017D,0x00AF
        ,0x00B0,0x0105,0x02DB,0x0157,0x00B4,0x0129,0x013C,0x02C7,0x00B8,0x0161,0x0113,0x0123,0x0167,0x014A,0x017E,0x014B
        ,0x0100,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x012E,0x010C,0x00C9,0x0118,0x00CB,0x0116,0x00CD,0x00CE,0x012A
        ,0x0110,0x0145,0x014C,0x0136,0x00D4,0x00D5,0x00D6,0x00D7,0x00D8,0x0172,0x00DA,0x00DB,0x00DC,0x0168,0x016A,0x00DF
        ,0x0101,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x012F,0x010D,0x00E9,0x0119,0x00EB,0x0117,0x00ED,0x00EE,0x012B
        ,0x0111,0x0146,0x014D,0x0137,0x00F4,0x00F5,0x00F6,0x00F7,0x00F8,0x0173,0x00FA,0x00FB,0x00FC,0x0169,0x016B,0x02D9
    ], "ISO88594", "ISO-8859-4", "Latin4" );
    
    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x0401,0x0402,0x0403,0x0404,0x0405,0x0406,0x0407,0x0408,0x0409,0x040A,0x040B,0x040C,0x00AD,0x040E,0x040F
        ,0x0410,0x0411,0x0412,0x0413,0x0414,0x0415,0x0416,0x0417,0x0418,0x0419,0x041A,0x041B,0x041C,0x041D,0x041E,0x041F
        ,0x0420,0x0421,0x0422,0x0423,0x0424,0x0425,0x0426,0x0427,0x0428,0x0429,0x042A,0x042B,0x042C,0x042D,0x042E,0x042F
        ,0x0430,0x0431,0x0432,0x0433,0x0434,0x0435,0x0436,0x0437,0x0438,0x0439,0x043A,0x043B,0x043C,0x043D,0x043E,0x043F
        ,0x0440,0x0441,0x0442,0x0443,0x0444,0x0445,0x0446,0x0447,0x0448,0x0449,0x044A,0x044B,0x044C,0x044D,0x044E,0x044F
        ,0x2116,0x0451,0x0452,0x0453,0x0454,0x0455,0x0456,0x0457,0x0458,0x0459,0x045A,0x045B,0x045C,0x00A7,0x045E,0x045F
    ], "ISO88595", "ISO-8859-5", "LatinCyrillic" );
    
    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0xFFFD,0xFFFD,0xFFFD,0x00A4,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0x060C,0x00AD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0x061B,0xFFFD,0xFFFD,0xFFFD,0x061F
        ,0xFFFD,0x0621,0x0622,0x0623,0x0624,0x0625,0x0626,0x0627,0x0628,0x0629,0x062A,0x062B,0x062C,0x062D,0x062E,0x062F
        ,0x0630,0x0631,0x0632,0x0633,0x0634,0x0635,0x0636,0x0637,0x0638,0x0639,0x063A,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0640,0x0641,0x0642,0x0643,0x0644,0x0645,0x0646,0x0647,0x0648,0x0649,0x064A,0x064B,0x064C,0x064D,0x064E,0x064F
        ,0x0650,0x0651,0x0652,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
    ], "ISO88596", "ISO-8859-6", "LatinArabic" );
    
    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x2018,0x2019,0x00A3,0x20AC,0x20AF,0x00A6,0x00A7,0x00A8,0x00A9,0x037A,0x00AB,0x00AC,0x00AD,0xFFFD,0x2015
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x0384,0x0385,0x0386,0x00B7,0x0388,0x0389,0x038A,0x00BB,0x038C,0x00BD,0x038E,0x038F
        ,0x0390,0x0391,0x0392,0x0393,0x0394,0x0395,0x0396,0x0397,0x0398,0x0399,0x039A,0x039B,0x039C,0x039D,0x039E,0x039F
        ,0x03A0,0x03A1,0xFFFD,0x03A3,0x03A4,0x03A5,0x03A6,0x03A7,0x03A8,0x03A9,0x03AA,0x03AB,0x03AC,0x03AD,0x03AE,0x03AF
        ,0x03B0,0x03B1,0x03B2,0x03B3,0x03B4,0x03B5,0x03B6,0x03B7,0x03B8,0x03B9,0x03BA,0x03BB,0x03BC,0x03BD,0x03BE,0x03BF
        ,0x03C0,0x03C1,0x03C2,0x03C3,0x03C4,0x03C5,0x03C6,0x03C7,0x03C8,0x03C9,0x03CA,0x03CB,0x03CC,0x03CD,0x03CE,0xFFFD
    ], "ISO88597", "ISO-8859-7", "LatinGreek" );
    
    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0xFFFD,0x00A2,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0x00D7,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x00B9,0x00F7,0x00BB,0x00BC,0x00BD,0x00BE,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0x2017
        ,0x05D0,0x05D1,0x05D2,0x05D3,0x05D4,0x05D5,0x05D6,0x05D7,0x05D8,0x05D9,0x05DA,0x05DB,0x05DC,0x05DD,0x05DE,0x05DF
        ,0x05E0,0x05E1,0x05E2,0x05E3,0x05E4,0x05E5,0x05E6,0x05E7,0x05E8,0x05E9,0x05EA,0xFFFD,0xFFFD,0x200E,0x200F,0xFFFD
    ], "ISO88598", "ISO-8859-8", "LatinHebrew" );
    
    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x00A1,0x00A2,0x00A3,0x00A4,0x00A5,0x00A6,0x00A7,0x00A8,0x00A9,0x00AA,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x00B4,0x00B5,0x00B6,0x00B7,0x00B8,0x00B9,0x00BA,0x00BB,0x00BC,0x00BD,0x00BE,0x00BF
        ,0x00C0,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF
        ,0x011E,0x00D1,0x00D2,0x00D3,0x00D4,0x00D5,0x00D6,0x00D7,0x00D8,0x00D9,0x00DA,0x00DB,0x00DC,0x0130,0x015E,0x00DF
        ,0x00E0,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF
        ,0x011F,0x00F1,0x00F2,0x00F3,0x00F4,0x00F5,0x00F6,0x00F7,0x00F8,0x00F9,0x00FA,0x00FB,0x00FC,0x0131,0x015F,0x00FF
    ], "ISO88599", "ISO-8859-9", "Latin5", "Turkish" );
    
    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x0104,0x0112,0x0122,0x012A,0x0128,0x0136,0x00A7,0x013B,0x0110,0x0160,0x0166,0x017D,0x00AD,0x016A,0x014A
        ,0x00B0,0x0105,0x0113,0x0123,0x012B,0x0129,0x0137,0x00B7,0x013C,0x0111,0x0161,0x0167,0x017E,0x2015,0x016B,0x014B
        ,0x0100,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x012E,0x010C,0x00C9,0x0118,0x00CB,0x0116,0x00CD,0x00CE,0x00CF
        ,0x00D0,0x0145,0x014C,0x00D3,0x00D4,0x00D5,0x00D6,0x0168,0x00D8,0x0172,0x00DA,0x00DB,0x00DC,0x00DD,0x00DE,0x00DF
        ,0x0101,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x012F,0x010D,0x00E9,0x0119,0x00EB,0x0117,0x00ED,0x00EE,0x00EF
        ,0x00F0,0x0146,0x014D,0x00F3,0x00F4,0x00F5,0x00F6,0x0169,0x00F8,0x0173,0x00FA,0x00FB,0x00FC,0x00FD,0x00FE,0x0138
    ], "ISO885910", "ISO-8859-10", "Latin6" );

    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x0E01,0x0E02,0x0E03,0x0E04,0x0E05,0x0E06,0x0E07,0x0E08,0x0E09,0x0E0A,0x0E0B,0x0E0C,0x0E0D,0x0E0E,0x0E0F
        ,0x0E10,0x0E11,0x0E12,0x0E13,0x0E14,0x0E15,0x0E16,0x0E17,0x0E18,0x0E19,0x0E1A,0x0E1B,0x0E1C,0x0E1D,0x0E1E,0x0E1F
        ,0x0E20,0x0E21,0x0E22,0x0E23,0x0E24,0x0E25,0x0E26,0x0E27,0x0E28,0x0E29,0x0E2A,0x0E2B,0x0E2C,0x0E2D,0x0E2E,0x0E2F
        ,0x0E30,0x0E31,0x0E32,0x0E33,0x0E34,0x0E35,0x0E36,0x0E37,0x0E38,0x0E39,0x0E3A,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0x0E3F
        ,0x0E40,0x0E41,0x0E42,0x0E43,0x0E44,0x0E45,0x0E46,0x0E47,0x0E48,0x0E49,0x0E4A,0x0E4B,0x0E4C,0x0E4D,0x0E4E,0x0E4F
        ,0x0E50,0x0E51,0x0E52,0x0E53,0x0E54,0x0E55,0x0E56,0x0E57,0x0E58,0x0E59,0x0E5A,0x0E5B,0xFFFD,0xFFFD,0xFFFD,0xFFFD
    ], "ISO885911", "ISO-8859-11", "LatinThai", "Windows874" );
        
     make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x201D,0x00A2,0x00A3,0x00A4,0x201E,0x00A6,0x00A7,0x00D8,0x00A9,0x0156,0x00AB,0x00AC,0x00AD,0x00AE,0x00C6
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x201C,0x00B5,0x00B6,0x00B7,0x00F8,0x00B9,0x0157,0x00BB,0x00BC,0x00BD,0x00BE,0x00E6
        ,0x0104,0x012E,0x0100,0x0106,0x00C4,0x00C5,0x0118,0x0112,0x010C,0x00C9,0x0179,0x0116,0x0122,0x0136,0x012A,0x013B
        ,0x0160,0x0143,0x0145,0x00D3,0x014C,0x00D5,0x00D6,0x00D7,0x0172,0x0141,0x015A,0x016A,0x00DC,0x017B,0x017D,0x00DF
        ,0x0105,0x012F,0x0101,0x0107,0x00E4,0x00E5,0x0119,0x0113,0x010D,0x00E9,0x017A,0x0117,0x0123,0x0137,0x012B,0x013C
        ,0x0161,0x0144,0x0146,0x00F3,0x014D,0x00F5,0x00F6,0x00F7,0x0173,0x0142,0x015B,0x016B,0x00FC,0x017C,0x017E,0x2019
    ], "ISO885913", "ISO-8859-13", "Latin7", "BalticRim" );

     make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x1E02,0x1E03,0x00A3,0x010A,0x010B,0x1E0A,0x00A7,0x1E80,0x00A9,0x1E82,0x1E0B,0x1EF2,0x00AD,0x00AE,0x0178
        ,0x1E1E,0x1E1F,0x0120,0x0121,0x1E40,0x1E41,0x00B6,0x1E56,0x1E81,0x1E57,0x1E83,0x1E60,0x1EF3,0x1E84,0x1E85,0x1E61
        ,0x00C0,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF
        ,0x0174,0x00D1,0x00D2,0x00D3,0x00D4,0x00D5,0x00D6,0x1E6A,0x00D8,0x00D9,0x00DA,0x00DB,0x00DC,0x00DD,0x0176,0x00DF
        ,0x00E0,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF
        ,0x0175,0x00F1,0x00F2,0x00F3,0x00F4,0x00F5,0x00F6,0x1E6B,0x00F8,0x00F9,0x00FA,0x00FB,0x00FC,0x00FD,0x0177,0x00FF
    ], "ISO885913", "ISO-8859-13", "Latin8", "Celtic" );

    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x00A1,0x00A2,0x00A3,0x20AC,0x00A5,0x0160,0x00A7,0x0161,0x00A9,0x00AA,0x00AB,0x00AC,0x00AD,0x00AE,0x00AF
        ,0x00B0,0x00B1,0x00B2,0x00B3,0x017D,0x00B5,0x00B6,0x00B7,0x017E,0x00B9,0x00BA,0x00BB,0x0152,0x0153,0x0178,0x00BF
        ,0x00C0,0x00C1,0x00C2,0x00C3,0x00C4,0x00C5,0x00C6,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF
        ,0x00D0,0x00D1,0x00D2,0x00D3,0x00D4,0x00D5,0x00D6,0x00D7,0x00D8,0x00D9,0x00DA,0x00DB,0x00DC,0x00DD,0x00DE,0x00DF
        ,0x00E0,0x00E1,0x00E2,0x00E3,0x00E4,0x00E5,0x00E6,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF
        ,0x00F0,0x00F1,0x00F2,0x00F3,0x00F4,0x00F5,0x00F6,0x00F7,0x00F8,0x00F9,0x00FA,0x00FB,0x00FC,0x00FD,0x00FE,0x00FF
    ], "ISO885915", "ISO-8859-15", "Latin9" );
    
    make8BitCharset( [
        0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x0020,0x0021,0x0022,0x0023,0x0024,0x0025,0x0026,0x0027,0x0028,0x0029,0x002A,0x002B,0x002C,0x002D,0x002E,0x002F
        ,0x0030,0x0031,0x0032,0x0033,0x0034,0x0035,0x0036,0x0037,0x0038,0x0039,0x003A,0x003B,0x003C,0x003D,0x003E,0x003F
        ,0x0040,0x0041,0x0042,0x0043,0x0044,0x0045,0x0046,0x0047,0x0048,0x0049,0x004A,0x004B,0x004C,0x004D,0x004E,0x004F
        ,0x0050,0x0051,0x0052,0x0053,0x0054,0x0055,0x0056,0x0057,0x0058,0x0059,0x005A,0x005B,0x005C,0x005D,0x005E,0x005F
        ,0x0060,0x0061,0x0062,0x0063,0x0064,0x0065,0x0066,0x0067,0x0068,0x0069,0x006A,0x006B,0x006C,0x006D,0x006E,0x006F
        ,0x0070,0x0071,0x0072,0x0073,0x0074,0x0075,0x0076,0x0077,0x0078,0x0079,0x007A,0x007B,0x007C,0x007D,0x007E,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD,0xFFFD
        ,0x00A0,0x0104,0x0105,0x0141,0x20AC,0x201E,0x0160,0x00A7,0x0161,0x00A9,0x0218,0x00AB,0x0179,0x00AD,0x017A,0x017B
        ,0x00B0,0x00B1,0x010C,0x0142,0x017D,0x201D,0x00B6,0x00B7,0x017E,0x010D,0x0219,0x00BB,0x0152,0x0153,0x0178,0x017C
        ,0x00C0,0x00C1,0x00C2,0x0102,0x00C4,0x0106,0x00C6,0x00C7,0x00C8,0x00C9,0x00CA,0x00CB,0x00CC,0x00CD,0x00CE,0x00CF
        ,0x0110,0x0143,0x00D2,0x00D3,0x00D4,0x0150,0x00D6,0x015A,0x0170,0x00D9,0x00DA,0x00DB,0x00DC,0x0118,0x021A,0x00DF
        ,0x00E0,0x00E1,0x00E2,0x0103,0x00E4,0x0107,0x00E6,0x00E7,0x00E8,0x00E9,0x00EA,0x00EB,0x00EC,0x00ED,0x00EE,0x00EF
        ,0x0111,0x0144,0x00F2,0x00F3,0x00F4,0x0151,0x00F6,0x015B,0x0171,0x00F9,0x00FA,0x00FB,0x00FC,0x0119,0x021B,0x00FF
    ], "ISO885916", "ISO-8859-16", "Latin10", "SouthEasternEuropean" );
    
    function checkDecodedCodePoint( codePoint, codePoints, fallback ) {
        if( isNaN( codePoint ) ) {
            codePoint = 0xFFFD;
        }
        else {
            codePoint >>>= 0; //prevent sign extension
            //Surrogate code point, or too high codepoint
            if( (0xD800 <= codePoint && codePoint <= 0xDFFF) ||
                codePoint > 0x10FFFF ) {
                codePoint = 0xFFFD;
            }
            else if( codePoint === 0xFEFF ) {
                codePoint = 0x2060; //Convert Boms in middle of text to WORD JOINER
            }
        }

        if( codePoint === 0xFFFD ) {
            if( fallback === unicode.REPLACEMENT_FALLBACK ) {
                codePoints.push( codePoint );
            }
            else if( fallback === unicode.ERROR_FALLBACK ) {
                throw new DecoderError( "Invalid byte sequence");
            }
            else if( fallback === unicode.IGNORE_FALLBACK ) {
                return;
            }
        }
        else {
            codePoints.push( codePoint );
        }
    }
    
    function getEncoderErrorCodePoint( fallback ) {
        switch( fallback ) {
            case ERROR_FALLBACK:
                throw new EncoderError( "Cannot encode codepoint to target encoding" );

            case IGNORE_FALLBACK:
                return -1;

            case REPLACEMENT_FALLBACK:
                return 0x003F; //"?"
        }
    }

    unicode.toUTF8 = function( str, fallback ) {
        fallback = checkFallback( fallback );
        var i = 0, 
            codePoint,
            ret = [];

        while( !isNaN( codePoint = unicode.at( str, i++ ) ) ) {

            if( codePoint < 0 ) { //-1 signals low surrogate, that we got a surrogate pair on last iteration.
                continue;
            }
            else if( codePoint === 0xFFFD ||
                codePoint > 0x10FFFF
            ) { 
                codePoint = getEncoderErrorCodePoint( fallback );
                if( codePoint < 0 ) {
                    continue;
                }
                else {
                    ret.push( String.fromCharCode( 0xEF, 0xBF, 0xBD));
                }
            }
            
            else if( codePoint <= 0x7F ) {
                ret.push( String.fromCharCode( codePoint & 0x7F ) );
            }
            else if( codePoint <= 0x7FF ) {
                ret.push( String.fromCharCode( 
                    0xC0 | ( ( codePoint & 0x7C0 ) >>> 6 ),
                    0x80 | ( codePoint & 0x3F )
                ));
            }
            else if( codePoint <= 0xFFFF ) {
                ret.push( String.fromCharCode(
                    0xE0 | ( ( codePoint & 0xF000 ) >>> 12 ),
                    0x80 | ( ( codePoint & 0xFC0 ) >>> 6 ),
                    0x80 | ( codePoint & 0x3F  )
                ));        
            }
            else if( codePoint <= 0x10FFFF ) {
                ret.push( String.fromCharCode(
                    0xF0 | ( ( codePoint & 0x1C0000 ) >>> 18 ),
                    0x80 | ( ( codePoint & 0x3F000 ) >>> 12 ),
                    0x80 | ( ( codePoint & 0xFC0 ) >>> 6 ),
                    0x80 | ( codePoint & 0x3F  )
                ));             
            }
        }

        return ret.join("");
    };
    
    

    unicode.fromUTF8 = function( str, fallback ) {
        str = checkBinary(str);
        fallback = checkFallback(fallback);
        //Decode unicode code points from utf8 encoded binarystring
        var codePoints = [],
            ch2, ch3, ch4,
            i = 0, byte, codePoint;

        while( !isNaN( byte = str.charCodeAt(i++) ) ) {
            if( (byte & 0xF8) === 0xF0 ) {
                codePoint = ((byte & 0x7) << 18) |
                            (((ch2 = str.charCodeAt(i++)) & 0x3F) << 12) |
                            (((ch3 = str.charCodeAt(i++)) & 0x3F) << 6) |
                            ((ch4 = str.charCodeAt(i++)) & 0x3F);
                            
                if( !( 0xFFFF < codePoint && codePoint <= 0x10FFFF ) ) {
                    //Overlong sequence
                    codePoint = 0xFFFD;
                }
                else if( 
                    ( ch2 & 0xC0 ) !== 0x80 || //must be 10xxxxxx
                    ( ch3 & 0xC0 ) !== 0x80 || //must be 10xxxxxx
                    ( ch4 & 0xC0 ) !== 0x80 //must be 10xxxxxx
               ) {
                    codePoint = 0xFFFD;
               }
               
               
               if( codePoint === 0xFFFD ) {
                   i -= 3; //Backtrack
               }
               
            }
            else if( (byte & 0xF0) === 0xE0 ) {
                codePoint = ((byte & 0xF) << 12) |
                        ((( ch2 = str.charCodeAt(i++)) & 0x3F) << 6 ) |
                        (( ch3 = str.charCodeAt(i++)) & 0x3F);
                 //Check for legit 0xFFFD
                if( codePoint !== 0xFFFD ) {
                    if( !( 0x7FF < codePoint && codePoint <= 0xFFFF ) ) {
                        //Overlong sequence
                        codePoint = 0xFFFD;
                    }
                    else if( 
                        ( ch2 & 0xC0 ) !== 0x80 || //must be 10xxxxxx
                        ( ch3 & 0xC0 ) !== 0x80 //must be 10xxxxxx
                        ) {
                        codePoint = 0xFFFD;
                    }

                    if( codePoint === 0xFFFD ) {
                        i -= 2; //Backtrack
                    }
                        //Ignore initial bom
                    if( codePoint === 0xFEFF && i === 3) {
                        continue;
                    }
                }
            }
            else if( (byte & 0xE0) === 0xC0 ) {
                codePoint = ((byte & 0x1F) << 6) |
                            ( (( ch2 = str.charCodeAt(i++)) & 0x3F) );
                if( !( 0x7F < codePoint && codePoint <= 0x7FF ) ) {
                    //Overlong sequence
                    codePoint = 0xFFFD;
                }
                else if( 
                    ( ch2 & 0xC0 ) !== 0x80 //must be 10xxxxxx
               ) {
                    codePoint = 0xFFFD;
               }
               
              if( codePoint === 0xFFFD ) {
                  i--; //Backtrack
               }
            }
            else if( (byte & 0x80) === 0x00 ) { //must be 0xxxxxxx
                codePoint = ( byte & 0x7F );
            }
            else {
                codePoint = 0xFFFD;
            }
            checkDecodedCodePoint( codePoint, codePoints, fallback );

        }    
        return unicode.from.apply( String, codePoints );
    };

    unicode.toUTF16 = function( str, fallback, endianess ) {
        fallback = checkFallback( fallback );
        var bom = "";
        switch( endianess ) {
            //Endianess explicitly given from BE and LE methods
            case LITTLE_ENDIAN:
            case BIG_ENDIAN:
                break;
            default:
                endianess = MACHINE_ENDIANESS;
                if( endianess === BIG_ENDIAN ) {
                    bom = UTF16BEBOM;
                }
                else {
                    bom = UTF16LEBOM;
                }
        }
        
        var i = 0, 
            codePoint,
            ch,
            low, high,
            ret = [];

        while( !isNaN( codePoint = unicode.at( str, i++ ) ) ) {

            if( codePoint < 0 ) { //-1 signals low surrogate, that we got a surrogate pair on last iteration.
                continue;
            }
            else if( codePoint === 0xFFFD ||
                codePoint > 0x10FFFF
            ) { 
                codePoint = getEncoderErrorCodePoint( fallback );
                if( codePoint < 0 ) {
                    continue;
                }
                else {
                    codePoint = 0xFFFD;
                }
            }
            
            if( codePoint >= 0x10000 ) {
                codePoint -= 0x10000;
                high = 0xD800 + ( ( codePoint & 0xFFC00 ) >>> 10 ),
                low = 0xDC00 + ( codePoint & 0x3FF )
            }
            else {
                low = high = null;
            }

            if( endianess === BIG_ENDIAN ) {
                if( low != null ) {
                    ch = String.fromCharCode(
                        (high >>> 8) & 0xFF,
                        (high & 0xFF),
                        (low >>> 8) & 0xFF,
                        (low & 0xFF)
                    );
                }
                else {
                    ch = String.fromCharCode(
                        (codePoint >>> 8) & 0xFF,
                        (codePoint & 0xFF)                        
                    );
                }
            }
            else {
                if( low != null ) {
                    ch = String.fromCharCode(
                        (high & 0xFF),
                        (high >>> 8) & 0xFF,
                        (low & 0xFF),
                        (low >>> 8) & 0xFF
                        
                    );
                }
                else {
                    ch = String.fromCharCode(
                        (codePoint & 0xFF),
                        (codePoint >>> 8) & 0xFF                 
                    );
                }         
            }
            ret.push(ch);
        }
        
        return bom + ret.join("");
    }

    unicode.toUTF16LE = function( str, fallback ) {
        return unicode.toUTF16( str, fallback, LITTLE_ENDIAN );
    };

    unicode.toUTF16BE = function( str, fallback ) {
        return unicode.toUTF16( str, fallback, BIG_ENDIAN );
    };

    unicode.fromUTF16 = function( str, fallback, endianess ) {
        str = checkBinary(str);
        var i = 0,
            len = str.length;

        fallback = checkFallback(fallback);

        if( len >= 2 ) {
            var bom = (str.charCodeAt(0) << 8) |
                      str.charCodeAt(1);
            if( bom === 0xFFFE ) {
                endianess = LITTLE_ENDIAN;
                i = 2; //Skip bom
            }
            else if( bom === 0xFEFF ) {
                endianess = BIG_ENDIAN;
                i = 2; //Skip bom
            }
            else {
                endianess = endianess || LITTLE_ENDIAN;
            }
        }
        else {
            endianess = endianess || LITTLE_ENDIAN;
        }
            
        
        
        var codePoints = [],
            codePoint,
            low, high,
            byte;
        
        if( endianess === BIG_ENDIAN ) {
            for( ; i < len; i+=2 ) {
                if( i+1 >= len ) {
                    codePoint = 0xFFFD;
                }
                else {
                    codePoint = (str.charCodeAt(i) << 8) |
                                str.charCodeAt(i+1);

                    //Lead surrogate 0xD800..0xDBFF
                    if( 0xD800 <= codePoint && codePoint <= 0xDBFF ) {
                        if( i + 3 >= len ) {
                            codePoint = 0xFFFD;
                        }
                        else {
                            high = codePoint;
                            //peek low surrogate
                            low = (str.charCodeAt(i+2) << 8) |
                                    str.charCodeAt(i+3);
                                    //Trail surrogate 0xDC00..0xDFFF
                            if( 0xDC00 <= low && low <= 0xDFFF ) {
                                i+=2; //Valid surrogate pair so ignore the upcoming low
                                codePoint = ((high - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
                            }// no else - checkDecodedCodePoint will handle invalid low
                        }
                    }// no else - checkDecodedCodePoint will handle invalid low
                }
                checkDecodedCodePoint( codePoint, codePoints, fallback );
            }        
        }
        else {
            for( ; i < len; i+=2 ) {
                if( i + 1 >= len ) {
                    codePoint = 0xFFFD;
                }
                else {
                    codePoint = str.charCodeAt(i) |
                                (str.charCodeAt(i+1) << 8 );
                    //Lead surrogate 0xD800..0xDBFF
                    if( 0xD800 <= codePoint && codePoint <= 0xDBFF ) {
                        if( i + 3 >= len ) {
                            codePoint = 0xFFFD;
                        }
                        else {
                            high = codePoint;
                            //peek low surrogate
                            low = str.charCodeAt(i+2) |
                                    (str.charCodeAt(i+3) << 8 );
                                    //Trail surrogate 0xDC00..0xDFFF
                            if( 0xDC00 <= low && low <= 0xDFFF ) {
                                i+=2; //Valid surrogate pair so ignore the upcoming low
                                codePoint = ((high - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
                            }// no else - checkDecodedCodePoint will handle the invalid high
                        }
                        
                    }// no else - checkDecodedCodePoint will handle invalid low
                }
                
                checkDecodedCodePoint( codePoint, codePoints, fallback );
            }
        }

        return unicode.from.apply( String, codePoints ); 
        
    };



    unicode.fromUTF16LE = function( str, fallback ) {
        return unicode.fromUTF16( str, fallback, LITTLE_ENDIAN );
    };

    unicode.fromUTF16BE = function( str, fallback ) {
        return unicode.fromUTF16( str, fallback, BIG_ENDIAN );
    };
    
    unicode.toUTF32 = function( str, fallback, endianess ) {
        fallback = checkFallback( fallback );
        var bom = "";
        switch( endianess ) {
            //Endianess explicitly given from BE and LE methods
            case LITTLE_ENDIAN:
            case BIG_ENDIAN:
                break;
            default:
                endianess = MACHINE_ENDIANESS;
                if( endianess === BIG_ENDIAN ) {
                    bom = UTF32BEBOM;
                }
                else {
                    bom = UTF32LEBOM;
                }
        }
        
        var i = 0, 
            codePoint,
            ch,
            ret = [];

        while( !isNaN( codePoint = unicode.at( str, i++ ) ) ) {

            if( codePoint < 0 ) { //-1 signals low surrogate, that we got a surrogate pair on last iteration.
                continue;
            }
            else if( codePoint === 0xFFFD ||
                codePoint > 0x10FFFF
            ) { 
                codePoint = getEncoderErrorCodePoint( fallback );
                if( codePoint < 0 ) {
                    continue;
                }
                else {
                    codePoint = 0xFFFD;
                }
            }

            if( endianess === BIG_ENDIAN ) {
                ch = String.fromCharCode(
                    (codePoint >>> 24) & 0xFF,
                    (codePoint >>> 16) & 0xFF,
                    (codePoint >>> 8) & 0xFF,
                    (codePoint & 0xFF)
                );
            }
            else {
                ch = String.fromCharCode(
                    (codePoint & 0xFF),
                    (codePoint >>> 8) & 0xFF,
                    (codePoint >>> 16) & 0xFF,
                    (codePoint >>> 24) & 0xFF
                );            
            }
            ret.push(ch);
        }
        
        return bom + ret.join("");
    }

    unicode.toUTF32LE = function( str, fallback ) {
        return unicode.toUTF32( str, fallback, LITTLE_ENDIAN );
    };

    unicode.toUTF32BE = function( str, fallback ) {
        return unicode.toUTF32( str, fallback, BIG_ENDIAN );
    };
    
    unicode.fromUTF32 = function( str, fallback, endianess ) {
        str = checkBinary(str);
        var i = 0,
            len = str.length;

        fallback = checkFallback(fallback);

        if( len >= 4 ) {
            var bom = ((str.charCodeAt(0) << 24) |
                      (str.charCodeAt(1) << 16) |
                      (str.charCodeAt(2) << 8) |
                      str.charCodeAt(3)) >>> 0;
            if( bom === 0xfffe0000 ) {
                endianess = LITTLE_ENDIAN;
                i = 4; //Skip bom
            }
            else if( bom === 0xfeff ) {
                endianess = BIG_ENDIAN;
                i = 4; //Skip bom
            }
            else {
                endianess = endianess || LITTLE_ENDIAN;
            }
        }
        else {

            endianess = endianess || LITTLE_ENDIAN;
        }
            
        
        
        var codePoints = [],
            codePoint,
            byte;
        
        if( endianess === BIG_ENDIAN ) {
            for( ; i < len; i+=4 ) {
                if( i+3 >= len ) {
                    codePoint = 0xFFFD;
                }
                else {
                    codePoint = (str.charCodeAt(i) << 24) |
                            (str.charCodeAt(i+1) << 16) |
                            (str.charCodeAt(i+2) << 8) |
                            str.charCodeAt(i+3);
                }
                checkDecodedCodePoint( codePoint, codePoints, fallback );
            }        
        }
        else {
            for( ; i < len; i+=4 ) {
                if( i+3 >= len ) {
                    codePoint = 0xFFFD;
                }
                else {
                    codePoint = str.charCodeAt(i) |
                            (str.charCodeAt(i+1) << 8) |
                            (str.charCodeAt(i+2) << 16) |
                            (str.charCodeAt(i+3) << 24);
                
                }
                checkDecodedCodePoint( codePoint, codePoints, fallback );
            }
        }

        return unicode.from.apply( String, codePoints ); 
        
    };

    unicode.fromUTF32LE = function( str, fallback ) {
        return unicode.fromUTF32( str, fallback, LITTLE_ENDIAN );
    };

    unicode.fromUTF32BE = function( str, fallback ) {
        return unicode.fromUTF32( str, fallback, BIG_ENDIAN );
    };
    
    function makeTableFromBin( bin, obj ) {
        for( var i = 0, l = bin.length; i < l; i+=4 ) {
            var jis = (bin.charCodeAt(i) << 8 ) | bin.charCodeAt(i+1);
            var uni = (bin.charCodeAt(i+2) << 8 ) | bin.charCodeAt(i+3);

            obj[jis] = uni;
        }
    }

    var binCP936 = atob("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");
    var binJISX0201 = atob("ACAAIAAhACEAIgAiACMAIwAkACQAJQAlACYAJgAnACcAKAAoACkAKQAqACoAKwArACwALAAtAC0ALgAuAC8ALwAwADAAMQAxADIAMgAzADMANAA0ADUANQA2ADYANwA3ADgAOAA5ADkAOgA6ADsAOwA8ADwAPQA9AD4APgA/AD8AQABAAEEAQQBCAEIAQwBDAEQARABFAEUARgBGAEcARwBIAEgASQBJAEoASgBLAEsATABMAE0ATQBOAE4ATwBPAFAAUABRAFEAUgBSAFMAUwBUAFQAVQBVAFYAVgBXAFcAWABYAFkAWQBaAFoAWwBbAFwApQBdAF0AXgBeAF8AXwBgAGAAYQBhAGIAYgBjAGMAZABkAGUAZQBmAGYAZwBnAGgAaABpAGkAagBqAGsAawBsAGwAbQBtAG4AbgBvAG8AcABwAHEAcQByAHIAcwBzAHQAdAB1AHUAdgB2AHcAdwB4AHgAeQB5AHoAegB7AHsAfAB8AH0AfQB+ID4Aof9hAKL/YgCj/2MApP9kAKX/ZQCm/2YAp/9nAKj/aACp/2kAqv9qAKv/awCs/2wArf9tAK7/bgCv/28AsP9wALH/cQCy/3IAs/9zALT/dAC1/3UAtv92ALf/dwC4/3gAuf95ALr/egC7/3sAvP98AL3/fQC+/34Av/9/AMD/gADB/4EAwv+CAMP/gwDE/4QAxf+FAMb/hgDH/4cAyP+IAMn/iQDK/4oAy/+LAMz/jADN/40Azv+OAM//jwDQ/5AA0f+RANL/kgDT/5MA1P+UANX/lQDW/5YA1/+XANj/mADZ/5kA2v+aANv/mwDc/5wA3f+dAN7/ngDf/58=");
    var binJISX0212 = atob("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NmdWszZoVrc2aVa+NmpWxTZrVsk2bFbKNm1WyzZuVs82b1bQNnBWzDZxVs02clbZNnNW3DZ0Vt02dVbfNnZW4TZ3VuQ2eFblNnlW5jZ6Vuc2e1boNnxW8TZ9Vus2flbtNyFW9jciVvc3I1cBNyRXAjclVwc3JlcKNydXDDcoVxE3KVcVNypXGjcrVxs3LFcdNy1XIDcuVyI3L1cjNzBXJDcxVyU3MlcpNzNXKjc0Vyw3NVcuNzZXLzc3VzM3OFc0NzlXPTc6Vz43O1c/NzxXRTc9V0Y3PldMNz9XTTdAV1I3QVdiN0JXZTdDV2c3RFdoN0VXazdGV203R1duN0hXbzdJV3A3SldxN0tXczdMV3Q3TVd1N05XdzdPV3k3UFd6N1FXezdSV3w3U1d+N1RXgTdVV4M3VleMN1dXlDdYV5c3WVeZN1pXmjdbV5w3XFedN11XnjdeV583X1ehN2BXlTdhV6c3YleoN2NXqTdkV6w3ZVe4N2ZXvTdnV8c3aFfIN2lXzDdqV883a1fVN2xX3TdtV943blfkN29X5jdwV+c3cVfpN3JX7TdzV/A3dFf1N3VX9jd2V/g3d1f9N3hX/jd5V/83elgDN3tYBDd8WAg3fVgJN35X4TghWAw4IlgNOCNYGzgkWB44JVgfOCZYIDgnWCY4KFgnOClYLTgqWDI4K1g5OCxYPzgtWEk4LlhMOC9YTTgwWE84MVhQODJYVTgzWF84NFhhODVYZDg2WGc4N1hoODhYeDg5WHw4Olh/ODtYgDg8WIE4PViHOD5YiDg/WIk4QFiKOEFYjDhCWI04Q1iPOERYkDhFWJQ4RliWOEdYnThIWKA4SVihOEpYojhLWKY4TFipOE1YsThOWLI4T1jEOFBYvDhRWMI4UljIOFNYzThUWM44VVjQOFZY0jhXWNQ4WFjWOFlY2jhaWN04W1jhOFxY4jhdWOk4XljzOF9ZBThgWQY4YVkLOGJZDDhjWRI4ZFkTOGVZFDhmhkE4Z1kdOGhZIThpWSM4alkkOGtZKDhsWS84bVkwOG5ZMzhvWTU4cFk2OHFZPzhyWUM4c1lGOHRZUjh1WVM4dllZOHdZWzh4WV04eVleOHpZXzh7WWE4fFljOH1Zazh+WW05IVlvOSJZcjkjWXU5JFl2OSVZeTkmWXs5J1l8OShZizkpWYw5KlmOOStZkjksWZU5LVmX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QD9j5UBAY+pAQWPsQEJj8kBDY/NARGP1QEVj+EBGY/lAR2QJQEhkCkBJZBBASmQSQEtkFEBMZBhATWQeQE5kIEBPZCJAUGQkQFFkJUBSZClAU2QqQFRkL0BVZDBAVmQ1QFdkPUBYZD9AWWRLQFpkT0BbZFFAXGRSQF1kU0BeZFRAX2RaQGBkW0BhZFxAYmRdQGNkX0BkZGBAZWRhQGZkY0BnZG1AaGRzQGlkdEBqZHtAa2R9QGxkhUBtZIdAbmSPQG9kkEBwZJFAcWSYQHJkmUBzZJtAdGSdQHVkn0B2ZKFAd2SjQHhkpkB5ZKhAemSsQHtks0B8ZL1AfWS+QH5kv0EhZMRBImTJQSNkykEkZMtBJWTMQSZkzkEnZNBBKGTRQSlk1UEqZNdBK2TkQSxk5UEtZOlBLmTqQS9k7UEwZPBBMWT1QTJk90EzZPtBNGT/QTVlAUE2ZQRBN2UIQThlCUE5ZQpBOmUPQTtlE0E8ZRRBPWUWQT5lGUE/ZRtBQGUeQUFlH0FCZSJBQ2UmQURlKUFFZS5BRmUxQUdlOkFIZTxBSWU9QUplQ0FLZUdBTGVJQU1lUEFOZVJBT2VUQVBlX0FRZWBBUmVnQVNla0FUZXpBVWV9QVZlgUFXZYVBWGWKQVllkkFaZZVBW2WYQVxlnUFdZaBBXmWjQV9lpkFgZa5BYWWyQWJls0FjZbRBZGW/QWVlwkFmZchBZ2XJQWhlzkFpZdBBamXUQWtl1kFsZdhBbWXfQW5l8EFvZfJBcGX0QXFl9UFyZflBc2X+QXRl/0F1ZgBBdmYEQXdmCEF4ZglBeWYNQXpmEUF7ZhJBfGYVQX1mFkF+Zh1CIWYeQiJmIUIjZiJCJGYjQiVmJEImZiZCJ2YpQihmKkIpZitCKmYsQitmLkIsZjBCLWYxQi5mM0IvZjlCMGY3QjFmQEIyZkVCM2ZGQjRmSkI1ZkxCNmZRQjdmTkI4ZldCOWZYQjpmWUI7ZltCPGZcQj1mYEI+ZmFCP2b7QkBmakJBZmtCQmZsQkNmfkJEZnNCRWZ1QkZmf0JHZndCSGZ4QklmeUJKZntCS2aAQkxmfEJNZotCTmaMQk9mjUJQZpBCUWaSQlJmmUJTZppCVGabQlVmnEJWZp9CV2agQlhmpEJZZq1CWmaxQltmskJcZrVCXWa7Ql5mv0JfZsBCYGbCQmFmw0JiZshCY2bMQmRmzkJlZs9CZmbUQmdm20JoZt9CaWboQmpm60JrZuxCbGbuQm1m+kJuZwVCb2cHQnBnDkJxZxNCcmcZQnNnHEJ0ZyBCdWciQnZnM0J3Zz5CeGdFQnlnR0J6Z0hCe2dMQnxnVEJ9Z1VCfmddQyFnZkMiZ2xDI2duQyRndEMlZ3ZDJmd7QydngUMoZ4RDKWeOQypnj0MrZ5FDLGeTQy1nlkMuZ5hDL2eZQzBnm0MxZ7BDMmexQzNnskM0Z7VDNWe7QzZnvEM3Z71DOGf5QzlnwEM6Z8JDO2fDQzxnxUM9Z8hDPmfJQz9n0kNAZ9dDQWfZQ0Jn3ENDZ+FDRGfmQ0Vn8ENGZ/JDR2f2Q0hn90NJaFJDSmgUQ0toGUNMaB1DTWgfQ05oKENPaCdDUGgsQ1FoLUNSaC9DU2gwQ1RoMUNVaDNDVmg7Q1doP0NYaERDWWhFQ1poSkNbaExDXGhVQ11oV0NeaFhDX2hbQ2Boa0NhaG5DYmhvQ2NocENkaHFDZWhyQ2ZodUNnaHlDaGh6Q2loe0NqaHxDa2iCQ2xohENtaIZDbmiIQ29olkNwaJhDcWiaQ3JonENzaKFDdGijQ3VopUN2aKlDd2iqQ3horkN5aLJDemi7Q3toxUN8aMhDfWjMQ35oz0QhaNBEImjRRCNo00QkaNZEJWjZRCZo3EQnaN1EKGjlRClo6EQqaOpEK2jrRCxo7EQtaO1ELmjwRC9o8UQwaPVEMWj2RDJo+0QzaPxENGj9RDVpBkQ2aQlEN2kKRDhpEEQ5aRFEOmkTRDtpFkQ8aRdEPWkxRD5pM0Q/aTVEQGk4REFpO0RCaUJEQ2lFRERpSURFaU5ERmlXREdpW0RIaWNESWlkREppZURLaWZETGloRE1paUROaWxET2lwRFBpcURRaXJEUml6RFNpe0RUaX9EVWmARFZpjURXaZJEWGmWRFlpmERaaaFEW2mlRFxppkRdaahEXmmrRF9prURgaa9EYWm3RGJpuERjabpEZGm8RGVpxURmachEZ2nRRGhp1kRpaddEamniRGtp5URsae5EbWnvRG5p8URvafNEcGn1RHFp/kRyagBEc2oBRHRqA0R1ag9EdmoRRHdqFUR4ahpEeWodRHpqIER7aiREfGooRH1qMER+ajJFIWo0RSJqN0UjajtFJGo+RSVqP0UmakVFJ2pGRShqSUUpakpFKmpORStqUEUsalFFLWpSRS5qVUUvalZFMGpbRTFqZEUyamdFM2pqRTRqcUU1anNFNmp+RTdqgUU4aoNFOWqGRTpqh0U7aolFPGqLRT1qkUU+aptFP2qdRUBqnkVBap9FQmqlRUNqq0VEaq9FRWqwRUZqsUVHarRFSGq9RUlqvkVKar9FS2rGRUxqyUVNashFTmrMRU9q0EVQatRFUWrVRVJq1kVTatxFVGrdRVVq5EVWaudFV2rsRVhq8EVZavFFWmryRVtq/EVcav1FXWsCRV5rA0VfawZFYGsHRWFrCUViaw9FY2sQRWRrEUVlaxdFZmsbRWdrHkVoayRFaWsoRWprK0VrayxFbGsvRW1rNUVuazZFb2s7RXBrP0Vxa0ZFcmtKRXNrTUV0a1JFdWtWRXZrWEV3a11FeGtgRXlrZ0V6a2tFe2tuRXxrcEV9a3VFfmt9RiFrfkYia4JGI2uFRiRrl0Yla5tGJmufRidroEYoa6JGKWujRiprqEYra6lGLGusRi1rrUYua65GL2uwRjBruEYxa7lGMmu9RjNrvkY0a8NGNWvERjZryUY3a8xGOGvWRjlr2kY6a+FGO2vjRjxr5kY9a+dGPmvuRj9r8UZAa/dGQWv5RkJr/0ZDbAJGRGwERkVsBUZGbAlGR2wNRkhsDkZJbBBGSmwSRktsGUZMbB9GTWwmRk5sJ0ZPbChGUGwsRlFsLkZSbDNGU2w1RlRsNkZVbDpGVmw7RldsP0ZYbEpGWWxLRlpsTUZbbE9GXGxSRl1sVEZebFlGX2xbRmBsXEZhbGtGYmxtRmNsb0ZkbHRGZWx2RmZseEZnbHlGaGx7RmlshUZqbIZGa2yHRmxsiUZtbJRGbmyVRm9sl0ZwbJhGcWycRnJsn0ZzbLBGdGyyRnVstEZ2bMJGd2zGRnhszUZ5bM9GemzQRnts0UZ8bNJGfWzURn5s1kchbNpHImzcRyNs4EckbOdHJWzpRyZs60cnbOxHKGzuRyls8kcqbPRHK20ERyxtB0ctbQpHLm0ORy9tD0cwbRFHMW0TRzJtGkczbSZHNG0nRzVtKEc2bGdHN20uRzhtL0c5bTFHOm05RzttPEc8bT9HPW1XRz5tXkc/bV9HQG1hR0FtZUdCbWdHQ21vR0RtcEdFbXxHRm2CR0dth0dIbZFHSW2SR0ptlEdLbZZHTG2XR01tmEdObapHT22s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TmF3F05idxlOY3caTmR3HE5ldyJOZncoTmd3LU5ody5OaXcvTmp3NE5rdzVObHc2Tm13OU5udz1Ob3c+TnB3Qk5xd0VOcndGTnN3Sk50d01OdXdOTnZ3T053d1JOeHdWTnl3V056d1xOe3deTnx3X059d2BOfndiTyF3ZE8id2dPI3dqTyR3bE8ld3BPJndyTyd3c08od3RPKXd6Typ3fU8rd4BPLHeETy13jE8ud41PL3eUTzB3lU8xd5ZPMneaTzN3n080d6JPNXenTzZ3qk83d65POHevTzl3sU86d7VPO3e+Tzx3w089d8lPPnfRTz930k9Ad9VPQXfZT0J33k9Dd99PRHfgT0V35E9Gd+ZPR3fqT0h37E9Jd/BPSnfxT0t39E9Md/hPTXf7T054BU9PeAZPUHgJT1F4DU9SeA5PU3gRT1R4HU9VeCFPVngiT1d4I09YeC1PWXguT1p4ME9beDVPXHg3T114Q09eeERPX3hHT2B4SE9heExPYnhOT2N4Uk9keFxPZXheT2Z4YE9neGFPaHhjT2l4ZE9qeGhPa3hqT2x4bk9teHpPbnh+T294ik9weI9PcXiUT3J4mE9zeKFPdHidT3V4nk92eJ9Pd3ikT3h4qE95eKxPenitT3t4sE98eLFPfXiyT354s1AheLtQIni9UCN4v1AkeMdQJXjIUCZ4yVAneMxQKHjOUCl40lAqeNNQK3jVUCx41lAteORQLnjbUC9431AweOBQMXjhUDJ45lAzeOpQNHjyUDV481A2eQBQN3j2UDh491A5ePpQOnj7UDt4/1A8eQZQPXkMUD55EFA/eRpQQHkcUEF5HlBCeR9QQ3kgUER5JVBFeSdQRnkpUEd5LVBIeTFQSXk0UEp5NVBLeTtQTHk9UE15P1BOeURQT3lFUFB5RlBReUpQUnlLUFN5T1BUeVFQVXlUUFZ5WFBXeVtQWHlcUFl5Z1BaeWlQW3lrUFx5clBdeXlQXnl7UF95fFBgeX5QYXmLUGJ5jFBjeZFQZHmTUGV5lFBmeZVQZ3mWUGh5mFBpeZtQanmcUGt5oVBseahQbXmpUG55q1Bvea9QcHmxUHF5tFByebhQc3m7UHR5wlB1ecRQdnnHUHd5yFB4ecpQeXnPUHp51FB7edZQfHnaUH153VB+ed5RIXngUSJ54lEjeeVRJHnqUSV561Emee1RJ3nxUSh5+FEpefxRKnoCUSt6A1EsegdRLXoJUS56ClEvegxRMHoRUTF6FVEyehtRM3oeUTR6IVE1eidRNnorUTd6LVE4ei9ROXowUTp6NFE7ejVRPHo4UT16OVE+ejpRP3pEUUB6RVFBekdRQnpIUUN6TFFEelVRRXpWUUZ6WVFHelxRSHpdUUl6X1FKemBRS3plUUx6Z1FNempRTnptUU96dVFQenhRUXp+UVJ6gFFTeoJRVHqFUVV6hlFWeopRV3qLUVh6kFFZepFRWnqUUVt6nlFceqBRXXqjUV56rFFferNRYHq1UWF6uVFiertRY3q8UWR6xlFleslRZnrMUWd6zlFoetFRaXrbUWp66FFreulRbHrrUW167FFuevFRb3r0UXB6+1Fxev1Rcnr+UXN7B1F0exRRdXsfUXZ7I1F3eydReHspUXl7KlF6eytRe3stUXx7LlF9ey9RfnswUiF7MVIiezRSI3s9UiR7P1Ile0BSJntBUid7R1Ioe05SKXtVUip7YFIre2RSLHtmUi17aVIue2pSL3ttUjB7b1Ixe3JSMntzUjN7d1I0e4RSNXuJUjZ7jlI3e5BSOHuRUjl7llI6e5tSO3ueUjx7oFI9e6VSPnusUj97r1JAe7BSQXuyUkJ7tVJDe7ZSRHu6UkV7u1JGe7xSR3u9Ukh7wlJJe8VSSnvIUkt7ylJMe9RSTXvWUk5711JPe9lSUHvaUlF721JSe+hSU3vqUlR78lJVe/RSVnv1Uld7+FJYe/lSWXv6Ulp7/FJbe/5SXHwBUl18AlJefANSX3wEUmB8BlJhfAlSYnwLUmN8DFJkfA5SZXwPUmZ8GVJnfBtSaHwgUml8JVJqfCZSa3woUmx8LFJtfDFSbnwzUm98NFJwfDZScXw5UnJ8OlJzfEZSdHxKUnV8VVJ2fFFSd3xSUnh8U1J5fFlSenxaUnt8W1J8fFxSfXxdUn58XlMhfGFTInxjUyN8Z1MkfGlTJXxtUyZ8blMnfHBTKHxyUyl8eVMqfHxTK3x9Uyx8hlMtfIdTLnyPUy98lFMwfJ5TMXygUzJ8plMzfLBTNHy2UzV8t1M2fLpTN3y7Uzh8vFM5fL9TOnzEUzt8x1M8fMhTPXzJUz58zVM/fM9TQHzTU0F81FNCfNVTQ3zXU0R82VNFfNpTRnzdU0d85lNIfOlTSXzrU0p89VNLfQNTTH0HU019CFNOfQlTT30PU1B9EVNRfRJTUn0TU1N9FlNUfR1TVX0eU1Z9I1NXfSZTWH0qU1l9LVNafTFTW308U1x9PVNdfT5TXn1AU199QVNgfUdTYX1IU2J9TVNjfVFTZH1TU2V9V1NmfVlTZ31aU2h9XFNpfV1Tan1lU2t9Z1NsfWpTbX1wU259eFNvfXpTcH17U3F9f1NyfYFTc32CU3R9g1N1fYVTdn2GU3d9iFN4fYtTeX2MU3p9jVN7fZFTfH2WU319l1N+fZ1UIX2eVCJ9plQjfadUJH2qVCV9s1QmfbZUJ323VCh9uVQpfcJUKn3DVCt9xFQsfcVULX3GVC59zFQvfc1UMH3OVDF911QyfdlUM34AVDR94lQ1feVUNn3mVDd96lQ4fetUOX3tVDp98VQ7ffVUPH32VD19+VQ+ffpUP34IVEB+EFRBfhFUQn4VVEN+F1REfhxURX4dVEZ+IFRHfidUSH4oVEl+LFRKfi1US34vVEx+M1RNfjZUTn4/VE9+RFRQfkVUUX5HVFJ+TlRTflBUVH5SVFV+WFRWfl9UV35hVFh+YlRZfmVUWn5rVFt+blRcfm9UXX5zVF5+eFRffn5UYH6BVGF+hlRifodUY36KVGR+jVRlfpFUZn6VVGd+mFRofppUaX6dVGp+nlRrfzxUbH87VG1/PVRufz5Ub38/VHB/Q1Rxf0RUcn9HVHN/T1R0f1JUdX9TVHZ/W1R3f1xUeH9dVHl/YVR6f2NUe39kVHx/ZVR9f2ZUfn9tVSF/cVUif31VI39+VSR/f1Ulf4BVJn+LVSd/jVUof49VKX+QVSp/kVUrf5ZVLH+XVS1/nFUuf6FVL3+iVTB/plUxf6pVMn+tVTN/tFU0f7xVNX+/VTZ/wFU3f8NVOH/IVTl/zlU6f89VO3/bVTx/31U9f+NVPn/lVT9/6FVAf+xVQX/uVUJ/71VDf/JVRH/6VUV//VVGf/5VR3//VUiAB1VJgAhVSoAKVUuADVVMgA5VTYAPVU6AEVVPgBNVUIAUVVGAFlVSgB1VU4AeVVSAH1VVgCBVVoAkVVeAJlVYgCxVWYAuVVqAMFVbgDRVXIA1VV2AN1VegDlVX4A6VWCAPFVhgD5VYoBAVWOARFVkgGBVZYBkVWaAZlVngG1VaIBxVWmAdVVqgIFVa4CIVWyAjlVtgJxVboCeVW+AplVwgKdVcYCrVXKAuFVzgLlVdIDIVXWAzVV2gM9Vd4DSVXiA1FV5gNVVeoDXVXuA2FV8gOBVfYDtVX6A7lYhgPBWIoDyViOA81YkgPZWJYD5ViaA+lYngP5WKIEDVimBC1YqgRZWK4EXViyBGFYtgRxWLoEeVi+BIFYwgSRWMYEnVjKBLFYzgTBWNIE1VjWBOlY2gTxWN4FFVjiBR1Y5gUpWOoFMVjuBUlY8gVdWPYFgVj6BYVY/gWdWQIFoVkGBaVZCgW1WQ4FvVkSBd1ZFgYFWRoGQVkeBhFZIgYVWSYGGVkqBi1ZLgY5WTIGWVk2BmFZOgZtWT4GeVlCBolZRga5WUoGyVlOBtFZUgbtWVYHLVlaBw1ZXgcVWWIHKVlmBzlZagc9WW4HVVlyB11ZdgdtWXoHdVl+B3lZggeFWYYHkVmKB61ZjgexWZIHwVmWB8VZmgfJWZ4H1VmiB9lZpgfhWaoH5VmuB/VZsgf9WbYIAVm6CA1Zvgg9WcIITVnGCFFZyghlWc4IaVnSCHVZ1giFWdoIiVneCKFZ4gjJWeYI0VnqCOlZ7gkNWfIJEVn2CRVZ+gkZXIYJLVyKCTlcjgk9XJIJRVyWCVlcmglxXJ4JgVyiCY1cpgmdXKoJtVyuCdFcsgntXLYJ9Vy6Cf1cvgoBXMIKBVzGCg1cygoRXM4KHVzSCiVc1gopXNoKOVzeCkVc4gpRXOYKWVzqCmFc7gppXPIKbVz2CoFc+gqFXP4KjV0CCpFdBgqdXQoKoV0OCqVdEgqpXRYKuV0aCsFdHgrJXSIK0V0mCt1dKgrpXS4K8V0yCvldNgr9XToLGV0+C0FdQgtVXUYLaV1KC4FdTguJXVILkV1WC6FdWgupXV4LtV1iC71dZgvZXWoL3V1uC/Vdcgv5XXYMAV16DAVdfgwdXYIMIV2GDCldigwtXY4NUV2SDG1dlgx1XZoMeV2eDH1dogyFXaYMiV2qDLFdrgy1XbIMuV22DMFdugzNXb4M3V3CDOldxgzxXcoM9V3ODQld0g0NXdYNEV3aDR1d3g01XeINOV3mDUVd6g1VXe4NWV3yDV1d9g3BXfoN4WCGDfVgig39YI4OAWCSDglglg4RYJoOGWCeDjVgog5JYKYOUWCqDlVgrg5hYLIOZWC2Dm1gug5xYL4OdWDCDplgxg6dYMoOpWDODrFg0g75YNYO/WDaDwFg3g8dYOIPJWDmDz1g6g9BYO4PRWDyD1Fg9g91YPoNTWD+D6FhAg+pYQYP2WEKD+FhDg/lYRIP8WEWEAVhGhAZYR4QKWEiED1hJhBFYSoQVWEuEGVhMg61YTYQvWE6EOVhPhEVYUIRHWFGESFhShEpYU4RNWFSET1hVhFFYVoRSWFeEVlhYhFhYWYRZWFqEWlhbhFxYXIRgWF2EZFhehGVYX4RnWGCEalhhhHBYYoRzWGOEdFhkhHZYZYR4WGaEfFhnhH1YaISBWGmEhVhqhJJYa4STWGyElVhthJ5YboSmWG+EqFhwhKlYcYSqWHKEr1hzhLFYdIS0WHWEulh2hL1Yd4S+WHiEwFh5hMJYeoTHWHuEyFh8hMxYfYTPWH6E01khhNxZIoTnWSOE6lkkhO9ZJYTwWSaE8VknhPJZKIT3WSmFMlkqhPpZK4T7WSyE/VkthQJZLoUDWS+FB1kwhQxZMYUOWTKFEFkzhRxZNIUeWTWFIlk2hSNZN4UkWTiFJVk5hSdZOoUqWTuFK1k8hS9ZPYUzWT6FNFk/hTZZQIU/WUGFRllChU9ZQ4VQWUSFUVlFhVJZRoVTWUeFVllIhVlZSYVcWUqFXVlLhV5ZTIVfWU2FYFlOhWFZT4ViWVCFZFlRhWtZUoVvWVOFeVlUhXpZVYV7WVaFfVlXhX9ZWIWBWVmFhVlahYZZW4WJWVyFi1ldhYxZXoWPWV+Fk1lghZhZYYWdWWKFn1ljhaBZZIWiWWWFpVlmhadZZ4W0WWiFtllphbdZaoW4WWuFvFlshb1ZbYW+WW6Fv1lvhcJZcIXHWXGFyllyhctZc4XOWXSFrVl1hdhZdoXaWXeF31l4heBZeYXmWXqF6Fl7he1ZfIXzWX2F9ll+hfxaIYX/WiKGAFojhgRaJIYFWiWGDVomhg5aJ4YQWiiGEVophhJaKoYYWiuGGVoshhtaLYYeWi6GIVovhidaMIYpWjGGNloyhjhaM4Y6WjSGPFo1hj1aNoZAWjeGQlo4hkZaOYZSWjqGU1o7hlZaPIZXWj2GWFo+hllaP4ZdWkCGYFpBhmFaQoZiWkOGY1pEhmRaRYZpWkaGbFpHhm9aSIZ1WkmGdlpKhndaS4Z6WkyGjVpNhpFaToaWWk+GmFpQhppaUYacWlKGoVpThqZaVIanWlWGqFpWhq1aV4axWliGs1pZhrRaWoa1WluGt1pchrhaXYa5Wl6Gv1pfhsBaYIbBWmGGw1pihsVaY4bRWmSG0lplhtVaZobXWmeG2lpohtxaaYbgWmqG41prhuVabIbnWm2GiFpuhvpab4b8WnCG/VpxhwRacocFWnOHB1p0hwtadYcOWnaHD1p3hxBaeIcTWnmHFFp6hxlae4ceWnyHH1p9hyFafocjWyGHKFsihy5bI4cvWySHMVslhzJbJoc5WyeHOlsohzxbKYc9WyqHPlsrh0BbLIdDWy2HRVsuh01bL4dYWzCHXVsxh2FbModkWzOHZVs0h29bNYdxWzaHcls3h3tbOIeDWzmHhFs6h4VbO4eGWzyHh1s9h4hbPoeJWz+Hi1tAh4xbQYeQW0KHk1tDh5VbRIeXW0WHmFtGh5lbR4eeW0iHoFtJh6NbSoenW0uHrFtMh61bTYeuW06HsVtPh7VbUIe+W1GHv1tSh8FbU4fIW1SHyVtVh8pbVofOW1eH1VtYh9ZbWYfZW1qH2ltbh9xbXIffW12H4lteh+NbX4fkW2CH6lthh+tbYoftW2OH8Vtkh/NbZYf4W2aH+ltnh/9baIgBW2mIA1tqiAZba4gJW2yIClttiAtbbogQW2+IGVtwiBJbcYgTW3KIFFtziBhbdIgaW3WIG1t2iBxbd4geW3iIH1t5iChbeogtW3uILlt8iDBbfYgyW36INVwhiDpcIog8XCOIQVwkiENcJYhFXCaISFwniElcKIhKXCmIS1wqiE5cK4hRXCyIVVwtiFZcLohYXC+IWlwwiFxcMYhfXDKIYFwziGRcNIhpXDWIcVw2iHlcN4h7XDiIgFw5iJhcOoiaXDuIm1w8iJxcPYifXD6IoFw/iKhcQIiqXEGIulxCiL1cQ4i+XESIwFxFiMpcRojLXEeIzFxIiM1cSYjOXEqI0VxLiNJcTIjTXE2I21xOiN5cT4jnXFCI71xRiPBcUojxXFOI9VxUiPdcVYkBXFaJBlxXiQ1cWIkOXFmJD1xaiRVcW4kWXFyJGFxdiRlcXokaXF+JHFxgiSBcYYkmXGKJJ1xjiShcZIkwXGWJMVxmiTJcZ4k1XGiJOVxpiTpcaok+XGuJQFxsiUJcbYlFXG6JRlxviUlccIlPXHGJUlxyiVdcc4laXHSJW1x1iVxcdolhXHeJYlx4iWNceYlrXHqJblx7iXBcfIlzXH2JdVx+iXpdIYl7XSKJfF0jiX1dJImJXSWJjV0miZBdJ4mUXSiJlV0piZtdKomcXSuJn10siaBdLYmlXS6JsF0vibRdMIm1XTGJtl0yibddM4m8XTSJ1F01idVdNonWXTeJ1104idhdOYnlXTqJ6V07ietdPIntXT2J8V0+ifNdP4n2XUCJ+V1Bif1dQon/XUOKBF1EigVdRYoHXUaKD11HihFdSIoSXUmKFF1KihVdS4oeXUyKIF1NiiJdTookXU+KJl1QiitdUYosXVKKL11TijVdVIo3XVWKPV1Wij5dV4pAXViKQ11ZikVdWopHXVuKSV1cik1dXYpOXV6KU11filZdYIpXXWGKWF1iilxdY4pdXWSKYV1limVdZopnXWeKdV1oinZdaYp3XWqKeV1rinpdbIp7XW2Kfl1uin9db4qAXXCKg11xioZdcoqLXXOKj110ipBddYqSXXaKll13ipddeIqZXXmKn116iqdde4qpXXyKrl19iq9dfoqzXiGKtl4iirdeI4q7XiSKvl4lisNeJorGXieKyF4oisleKYrKXiqK0V4ritNeLIrUXi2K1V4uitdeL4rdXjCK314xiuxeMorwXjOK9F40ivVeNYr2XjaK/F43iv9eOIsFXjmLBl46iwteO4sRXjyLHF49ix5ePosfXj+LCl5Aiy1eQYswXkKLN15DizxeRItCXkWLQ15Gi0ReR4tFXkiLRl5Ji0heSotSXkuLU15Mi1ReTYtZXk6LTV5Pi15eUItjXlGLbV5Si3ZeU4t4XlSLeV5Vi3xeVot+XleLgV5Yi4ReWYuFXlqLi15bi41eXIuPXl2LlF5ei5VeX4ucXmCLnl5hi59eYow4XmOMOV5kjD1eZYw+XmaMRV5njEdeaIxJXmmMS15qjE9ea4xRXmyMU15tjFReboxXXm+MWF5wjFtecYxdXnKMWV5zjGNedIxkXnWMZl52jGhed4xpXniMbV55jHNeeox1XnuMdl58jHtefYx+Xn6Mhl8hjIdfIoyLXyOMkF8kjJJfJYyTXyaMmV8njJtfKIycXymMpF8qjLlfK4y6XyyMxV8tjMZfLozJXy+My18wjM9fMYzWXzKM1V8zjNlfNIzdXzWM4V82jOhfN4zsXziM7185jPBfOozyXzuM9V88jPdfPYz4Xz6M/l8/jP9fQI0BX0GNA19CjQlfQ40SX0SNF19FjRtfRo1lX0eNaV9IjWxfSY1uX0qNf19LjYJfTI2EX02NiF9OjY1fT42QX1CNkV9RjZVfUo2eX1ONn19UjaBfVY2mX1aNq19XjaxfWI2vX1mNsl9ajbVfW423X1yNuV9djbtfXo3AX1+NxV9gjcZfYY3HX2KNyF9jjcpfZI3OX2WN0V9mjdRfZ43VX2iN119pjdlfao3kX2uN5V9sjedfbY3sX26N8F9vjbxfcI3xX3GN8l9yjfRfc439X3SOAV91jgRfdo4FX3eOBl94jgtfeY4RX3qOFF97jhZffI4gX32OIV9+jiJgIY4jYCKOJmAjjidgJI4xYCWOM2AmjjZgJ443YCiOOGApjjlgKo49YCuOQGAsjkFgLY5LYC6OTWAvjk5gMI5PYDGOVGAyjltgM45cYDSOXWA1jl5gNo5hYDeOYmA4jmlgOY5sYDqObWA7jm9gPI5wYD2OcWA+jnlgP456YECOe2BBjoJgQo6DYEOOiWBEjpBgRY6SYEaOlWBHjppgSI6bYEmOnWBKjp5gS46iYEyOp2BNjqlgTo6tYE+OrmBQjrNgUY61YFKOumBTjrtgVI7AYFWOwWBWjsNgV47EYFiOx2BZjs9gWo7RYFuO1GBcjtxgXY7oYF6O7mBfjvBgYI7xYGGO92BijvlgY476YGSO7WBljwBgZo8CYGePB2BojwhgaY8PYGqPEGBrjxZgbI8XYG2PGGBujx5gb48gYHCPIWBxjyNgco8lYHOPJ2B0jyhgdY8sYHaPLWB3jy5geI80YHmPNWB6jzZge483YHyPOmB9j0Bgfo9BYSGPQ2Eij0dhI49PYSSPUWElj1JhJo9TYSePVGEoj1VhKY9YYSqPXWErj15hLI9lYS2PnWEuj6BhL4+hYTCPpGExj6VhMo+mYTOPtWE0j7ZhNY+4YTaPvmE3j8BhOI/BYTmPxmE6j8phO4/LYTyPzWE9j9BhPo/SYT+P02FAj9VhQY/gYUKP42FDj+RhRI/oYUWP7mFGj/FhR4/1YUiP9mFJj/thSo/+YUuQAmFMkARhTZAIYU6QDGFPkBhhUJAbYVGQKGFSkClhU5AvYVSQKmFVkCxhVpAtYVeQM2FYkDRhWZA3YVqQP2FbkENhXJBEYV2QTGFekFthX5BdYWCQYmFhkGZhYpBnYWOQbGFkkHBhZZB0YWaQeWFnkIVhaJCIYWmQi2FqkIxha5COYWyQkGFtkJVhbpCXYW+QmGFwkJlhcZCbYXKQoGFzkKFhdJCiYXWQpWF2kLBhd5CyYXiQs2F5kLRhepC2YXuQvWF8kMxhfZC+YX6Qw2IhkMRiIpDFYiOQx2IkkMhiJZDVYiaQ12InkNhiKJDZYimQ3GIqkN1iK5DfYiyQ5WItkNJiLpD2Yi+Q62IwkO9iMZDwYjKQ9GIzkP5iNJD/YjWRAGI2kQRiN5EFYjiRBmI5kQhiOpENYjuREGI8kRRiPZEWYj6RF2I/kRhiQJEaYkGRHGJCkR5iQ5EgYkSRJWJFkSJiRpEjYkeRJ2JIkSliSZEuYkqRL2JLkTFiTJE0Yk2RNmJOkTdiT5E5YlCROmJRkTxiUpE9YlORQ2JUkUdiVZFIYlaRT2JXkVNiWJFXYlmRWWJakVpiW5FbYlyRYWJdkWRiXpFnYl+RbWJgkXRiYZF5YmKRemJjkXtiZJGBYmWRg2JmkYViZ5GGYmiRimJpkY5iapGRYmuRk2JskZRibZGVYm6RmGJvkZ5icJGhYnGRpmJykahic5GsYnSRrWJ1ka5idpGwYneRsWJ4kbJieZGzYnqRtmJ7kbtifJG8Yn2RvWJ+kb9jIZHCYyKRw2MjkcVjJJHTYyWR1GMmkddjJ5HZYyiR2mMpkd5jKpHkYyuR5WMskeljLZHqYy6R7GMvke1jMJHuYzGR72MykfBjM5HxYzSR92M1kfljNpH7YzeR/WM4kgBjOZIBYzqSBGM7kgVjPJIGYz2SB2M+kgljP5IKY0CSDGNBkhBjQpISY0OSE2NEkhZjRZIYY0aSHGNHkh1jSJIjY0mSJGNKkiVjS5ImY0ySKGNNki5jTpIvY0+SMGNQkjNjUZI1Y1KSNmNTkjhjVJI5Y1WSOmNWkjxjV5I+Y1iSQGNZkkJjWpJDY1uSRmNckkdjXZJKY16STWNfkk5jYJJPY2GSUWNiklhjY5JZY2SSXGNlkl1jZpJgY2eSYWNokmVjaZJnY2qSaGNrkmljbJJuY22Sb2NuknBjb5J1Y3CSdmNxkndjcpJ4Y3OSeWN0kntjdZJ8Y3aSfWN3kn9jeJKIY3mSiWN6kopje5KNY3ySjmN9kpJjfpKXZCGSmWQikp9kI5KgZCSSpGQlkqVkJpKnZCeSqGQokqtkKZKvZCqSsmQrkrZkLJK4ZC2SumQukrtkL5K8ZDCSvWQxkr9kMpLAZDOSwWQ0ksJkNZLDZDaSxWQ3ksZkOJLHZDmSyGQ6kstkO5LMZDySzWQ9ks5kPpLQZD+S02RAktVkQZLXZEKS2GRDktlkRJLcZEWS3WRGkt9kR5LgZEiS4WRJkuNkSpLlZEuS52RMkuhkTZLsZE6S7mRPkvBkUJL5ZFGS+2RSkv9kU5MAZFSTAmRVkwhkVpMNZFeTEWRYkxRkWZMVZFqTHGRbkx1kXJMeZF2TH2RekyFkX5MkZGCTJWRhkydkYpMpZGOTKmRkkzNkZZM0ZGaTNmRnkzdkaJNHZGmTSGRqk0lka5NQZGyTUWRtk1JkbpNVZG+TV2Rwk1hkcZNaZHKTXmRzk2RkdJNlZHWTZ2R2k2lkd5NqZHiTbWR5k29kepNwZHuTcWR8k3NkfZN0ZH6TdmUhk3plIpN9ZSOTf2Ukk4BlJZOBZSaTgmUnk4hlKJOKZSmTi2Uqk41lK5OPZSyTkmUtk5VlLpOYZS+Tm2Uwk55lMZOhZTKTo2Uzk6RlNJOmZTWTqGU2k6tlN5O0ZTiTtWU5k7ZlOpO6ZTuTqWU8k8FlPZPEZT6TxWU/k8ZlQJPHZUGTyWVCk8plQ5PLZUSTzGVFk81lRpPTZUeT2WVIk9xlSZPeZUqT32VLk+JlTJPmZU2T52VOk/llT5P3ZVCT+GVRk/plUpP7ZVOT/WVUlAFlVZQCZVaUBGVXlAhlWJQJZVmUDWValA5lW5QPZVyUFWVdlBZlXpQXZV+UH2VglC5lYZQvZWKUMWVjlDJlZJQzZWWUNGVmlDtlZ5Q/ZWiUPWVplENlapRFZWuUSGVslEplbZRMZW6UVWVvlFllcJRcZXGUX2VylGFlc5RjZXSUaGV1lGtldpRtZXeUbmV4lG9leZRxZXqUcmV7lIRlfJSDZX2VeGV+lXlmIZV+ZiKVhGYjlYhmJJWMZiWVjWYmlY5mJ5WdZiiVnmYplZ9mKpWhZiuVpmYslalmLZWrZi6VrGYvlbRmMJW2ZjGVumYylb1mM5W/ZjSVxmY1lchmNpXJZjeVy2Y4ldBmOZXRZjqV0mY7ldNmPJXZZj2V2mY+ld1mP5XeZkCV32ZBleBmQpXkZkOV5mZElh1mRZYeZkaWImZHliRmSJYlZkmWJmZKlixmS5YxZkyWM2ZNljdmTpY4Zk+WOWZQljpmUZY8ZlKWPWZTlkFmVJZSZlWWVGZWllZmV5ZXZliWWGZZlmFmWpZuZluWdGZclntmXZZ8Zl6WfmZfln9mYJaBZmGWgmZiloNmY5aEZmSWiWZllpFmZpaWZmeWmmZolp1maZafZmqWpGZrlqVmbJamZm2WqWZulq5mb5avZnCWs2ZxlrpmcpbKZnOW0mZ0XbJmdZbYZnaW2mZ3lt1meJbeZnmW32Z6lulme5bvZnyW8WZ9lvpmfpcCZyGXA2cilwVnI5cJZySXGmcllxtnJpcdZyeXIWcolyJnKZcjZyqXKGcrlzFnLJczZy2XQWcul0NnL5dKZzCXTmcxl09nMpdVZzOXV2c0l1hnNZdaZzaXW2c3l2NnOJdnZzmXamc6l25nO5dzZzyXdmc9l3dnPpd4Zz+Xe2dAl31nQZd/Z0KXgGdDl4lnRJeVZ0WXlmdGl5dnR5eZZ0iXmmdJl55nSpefZ0uXomdMl6xnTZeuZ06XsWdPl7JnUJe1Z1GXtmdSl7hnU5e5Z1SXumdVl7xnVpe+Z1eXv2dYl8FnWZfEZ1qXxWdbl8dnXJfJZ12Xymdel8xnX5fNZ2CXzmdhl9BnYpfRZ2OX1Gdkl9dnZZfYZ2aX2Wdnl91naJfeZ2mX4Gdql9tna5fhZ2yX5Gdtl+9nbpfxZ2+X9Gdwl/dncZf4Z3KX+mdzmAdndJgKZ3WYGWd2mA1nd5gOZ3iYFGd5mBZnepgcZ3uYHmd8mCBnfZgjZ36YJmghmCtoIpguaCOYL2gkmDBoJZgyaCaYM2gnmDVoKJglaCmYPmgqmERoK5hHaCyYSmgtmFFoLphSaC+YU2gwmFZoMZhXaDKYWWgzmFpoNJhiaDWYY2g2mGVoN5hmaDiYamg5mGxoOpiraDuYrWg8mK5oPZiwaD6YtGg/mLdoQJi4aEGYumhCmLtoQ5i/aESYwmhFmMVoRpjIaEeYzGhImOFoSZjjaEqY5WhLmOZoTJjnaE2Y6mhOmPNoT5j2aFCZAmhRmQdoUpkIaFOZEWhUmRVoVZkWaFaZF2hXmRpoWJkbaFmZHGhamR9oW5kiaFyZJmhdmSdoXpkraF+ZMWhgmTJoYZkzaGKZNGhjmTVoZJk5aGWZOmhmmTtoZ5k8aGiZQGhpmUFoaplGaGuZR2hsmUhobZlNaG6ZTmhvmVRocJlYaHGZWWhymVtoc5lcaHSZXmh1mV9odplgaHeZm2h4mZ1oeZmfaHqZpmh7mbBofJmxaH2Zsmh+mbVpIZm5aSKZumkjmb1pJJm/aSWZw2kmmclpJ5nTaSiZ1GkpmdlpKpnaaSuZ3Gksmd5pLZnnaS6Z6mkvmetpMJnsaTGZ8GkymfRpM5n1aTSZ+Wk1mf1pNpn+aTeaAmk4mgNpOZoEaTqaC2k7mgxpPJoQaT2aEWk+mhZpP5oeaUCaIGlBmiJpQpojaUOaJGlEmidpRZotaUaaLmlHmjNpSJo1aUmaNmlKmjhpS5pHaUyaQWlNmkRpTppKaU+aS2lQmkxpUZpOaVKaUWlTmlRpVJpWaVWaXWlWmqppV5qsaViarmlZmq9pWpqyaVuatGlcmrVpXZq2aV6auWlfmrtpYJq+aWGav2limsFpY5rDaWSaxmllmshpZprOaWea0GlomtJpaZrVaWqa1mlrmtdpbJrbaW2a3GlumuBpb5rkaXCa5WlxmudpcprpaXOa7Gl0mvJpdZrzaXaa9Wl3mvlpeJr6aXma/Wl6mv9pe5sAaXybAWl9mwJpfpsDaiGbBGoimwVqI5sIaiSbCWolmwtqJpsMaiebDWoomw5qKZsQaiqbEmormxZqLJsZai2bG2oumxxqL5sgajCbJmoxmytqMpstajObM2o0mzRqNZs1ajabN2o3mzlqOJs6ajmbPWo6m0hqO5tLajybTGo9m1VqPptWaj+bV2pAm1tqQZteakKbYWpDm2NqRJtlakWbZmpGm2hqR5tqakiba2pJm2xqSpttakubbmpMm3NqTZt1ak6bd2pPm3hqUJt5alGbf2pSm4BqU5uEalSbhWpVm4ZqVpuHalebiWpYm4pqWZuLalqbjWpbm49qXJuQal2blGpem5pqX5udamCbnmphm6ZqYpunamObqWpkm6xqZZuwamabsWpnm7JqaJu3ammbuGpqm7tqa5u8amybvmptm79qbpvBam+bx2pwm8hqcZvOanKb0Gpzm9dqdJvYanWb3Wp2m99qd5vlanib52p5m+pqepvranub72p8m/NqfZv3an6b+Gshm/lrIpv6ayOb/Wskm/9rJZwAayacAmsnnAtrKJwPaymcEWsqnBZrK5wYayycGWstnBprLpwcay+cHmswnCJrMZwjazKcJmsznCdrNJwoazWcKWs2nCprN5wxazicNWs5nDZrOpw3azucPWs8nEFrPZxDaz6cRGs/nEVrQJxJa0GcSmtCnE5rQ5xPa0ScUGtFnFNrRpxUa0ecVmtInFhrSZxba0qcXWtLnF5rTJxfa02cY2tOnGlrT5xqa1CcXGtRnGtrUpxoa1OcbmtUnHBrVZxya1acdWtXnHdrWJx7a1mc5mtanPJrW5z3a1yc+WtdnQtrXp0Ca1+dEWtgnRdrYZ0Ya2KdHGtjnR1rZJ0ea2WdL2tmnTBrZ50ya2idM2tpnTRrap06a2udPGtsnUVrbZ09a26dQmtvnUNrcJ1Ha3GdSmtynVNrc51Ua3SdX2t1nWNrdp1ia3edZWt4nWlreZ1qa3qda2t7nXBrfJ12a32dd2t+nXtsIZ18bCKdfmwjnYNsJJ2EbCWdhmwmnYpsJ52NbCidjmwpnZJsKp2TbCudlWwsnZZsLZ2XbC6dmGwvnaFsMJ2qbDGdrGwyna5sM52xbDSdtWw1nblsNp28bDedv2w4ncNsOZ3HbDqdyWw7ncpsPJ3UbD2d1Ww+ndZsP53XbECd2mxBnd5sQp3fbEOd4GxEneVsRZ3nbEad6WxHnetsSJ3ubEmd8GxKnfNsS530bEyd/mxNngpsTp4CbE+eB2xQng5sUZ4QbFKeEWxTnhJsVJ4VbFWeFmxWnhlsV54cbFieHWxZnnpsWp57bFuefGxcnoBsXZ6CbF6eg2xfnoRsYJ6FbGGeh2xino5sY56PbGSelmxlnphsZp6bbGeenmxonqRsaZ6obGqerGxrnq5sbJ6vbG2esGxunrNsb560bHCetWxxnsZscp7IbHOey2x0ntVsdZ7fbHae5Gx3nudseJ7sbHme7Wx6nu5se57wbHye8Wx9nvJsfp71bSGe+G0inv9tI58CbSSfA20lnwltJp8PbSefEG0onxFtKZ8SbSqfFG0rnxZtLJ8XbS2fGW0unxptL58bbTCfH20xnyJtMp8mbTOfKm00nyttNZ8vbTafMW03nzJtOJ80bTmfN206nzltO586bTyfPG09nz1tPp8/bT+fQW1An0NtQZ9EbUKfRW1Dn0ZtRJ9HbUWfU21Gn1VtR59WbUifV21Jn1htSp9abUufXW1Mn15tTZ9obU6faW1Pn21tUJ9ubVGfb21Sn3BtU59xbVSfc21Vn3VtVp96bVeffW1Yn49tWZ+QbVqfkW1bn5JtXJ+UbV2flm1en5dtX5+ebWCfoW1hn6JtYp+jbWOfpQ==");
    var binJISX0208 = atob("ISEwACEiMAEhIzACIST/DCEl/w4hJjD7ISf/GiEo/xshKf8fISr/ASErMJshLDCcIS0AtCEu/0AhLwCoITD/PiEx/+MhMv8/ITMw/SE0MP4hNTCdITYwniE3MAMhOE7dITkwBSE6MAYhOzAHITww/CE9IBUhPiAQIT//DyFAAFwhQTAcIUIgFiFD/1whRCAmIUUgJSFGIBghRyAZIUggHCFJIB0hSv8IIUv/CSFMMBQhTTAVIU7/OyFP/z0hUP9bIVH/XSFSMAghUzAJIVQwCiFVMAshVjAMIVcwDSFYMA4hWTAPIVowECFbMBEhXP8LIV0iEiFeALEhXwDXIWAA9yFh/x0hYiJgIWP/HCFk/x4hZSJmIWYiZyFnIh4haCI0IWkmQiFqJkAhawCwIWwgMiFtIDMhbiEDIW//5SFw/wQhcQCiIXIAoyFz/wUhdP8DIXX/BiF2/wohd/8gIXgApyF5JgYheiYFIXslyyF8Jc8hfSXOIX4lxyIhJcYiIiWhIiMloCIkJbMiJSWyIiYlvSInJbwiKCA7IikwEiIqIZIiKyGQIiwhkSItIZMiLjATIjoiCCI7IgsiPCKGIj0ihyI+IoIiPyKDIkAiKiJBIikiSiInIksiKCJMAKwiTSHSIk4h1CJPIgAiUCIDIlwiICJdIqUiXiMSIl8iAiJgIgciYSJhImIiUiJjImoiZCJrImUiGiJmIj0iZyIdImgiNSJpIisiaiIsInIhKyJzIDAidCZvInUmbSJ2JmoidyAgInggISJ5ALYifiXvIzD/ECMx/xEjMv8SIzP/EyM0/xQjNf8VIzb/FiM3/xcjOP8YIzn/GSNB/yEjQv8iI0P/IyNE/yQjRf8lI0b/JiNH/ycjSP8oI0n/KSNK/yojS/8rI0z/LCNN/y0jTv8uI0//LyNQ/zAjUf8xI1L/MiNT/zMjVP80I1X/NSNW/zYjV/83I1j/OCNZ/zkjWv86I2H/QSNi/0IjY/9DI2T/RCNl/0UjZv9GI2f/RyNo/0gjaf9JI2r/SiNr/0sjbP9MI23/TSNu/04jb/9PI3D/UCNx/1Ejcv9SI3P/UyN0/1Qjdf9VI3b/ViN3/1cjeP9YI3n/WSN6/1okITBBJCIwQiQjMEMkJDBEJCUwRSQmMEYkJzBHJCgwSCQpMEkkKjBKJCswSyQsMEwkLTBNJC4wTiQvME8kMDBQJDEwUSQyMFIkMzBTJDQwVCQ1MFUkNjBWJDcwVyQ4MFgkOTBZJDowWiQ7MFskPDBcJD0wXSQ+MF4kPzBfJEAwYCRBMGEkQjBiJEMwYyREMGQkRTBlJEYwZiRHMGckSDBoJEkwaSRKMGokSzBrJEwwbCRNMG0kTjBuJE8wbyRQMHAkUTBxJFIwciRTMHMkVDB0JFUwdSRWMHYkVzB3JFgweCRZMHkkWjB6JFsweyRcMHwkXTB9JF4wfiRfMH8kYDCAJGEwgSRiMIIkYzCDJGQwhCRlMIUkZjCGJGcwhyRoMIgkaTCJJGowiiRrMIskbDCMJG0wjSRuMI4kbzCPJHAwkCRxMJEkcjCSJHMwkyUhMKElIjCiJSMwoyUkMKQlJTClJSYwpiUnMKclKDCoJSkwqSUqMKolKzCrJSwwrCUtMK0lLjCuJS8wryUwMLAlMTCxJTIwsiUzMLMlNDC0JTUwtSU2MLYlNzC3JTgwuCU5MLklOjC6JTswuyU8MLwlPTC9JT4wviU/ML8lQDDAJUEwwSVCMMIlQzDDJUQwxCVFMMUlRjDGJUcwxyVIMMglSTDJJUowyiVLMMslTDDMJU0wzSVOMM4lTzDPJVAw0CVRMNElUjDSJVMw0yVUMNQlVTDVJVYw1iVXMNclWDDYJVkw2SVaMNolWzDbJVww3CVdMN0lXjDeJV8w3yVgMOAlYTDhJWIw4iVjMOMlZDDkJWUw5SVmMOYlZzDnJWgw6CVpMOklajDqJWsw6yVsMOwlbTDtJW4w7iVvMO8lcDDwJXEw8SVyMPIlczDzJXQw9CV1MPUldjD2JiEDkSYiA5ImIwOTJiQDlCYlA5UmJgOWJicDlyYoA5gmKQOZJioDmiYrA5smLAOcJi0DnSYuA54mLwOfJjADoCYxA6EmMgOjJjMDpCY0A6UmNQOmJjYDpyY3A6gmOAOpJkEDsSZCA7ImQwOzJkQDtCZFA7UmRgO2JkcDtyZIA7gmSQO5JkoDuiZLA7smTAO8Jk0DvSZOA74mTwO/JlADwCZRA8EmUgPDJlMDxCZUA8UmVQPGJlYDxyZXA8gmWAPJJyEEECciBBEnIwQSJyQEEyclBBQnJgQVJycEAScoBBYnKQQXJyoEGCcrBBknLAQaJy0EGycuBBwnLwQdJzAEHicxBB8nMgQgJzMEISc0BCInNQQjJzYEJCc3BCUnOAQm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Ry9edEcwX/VHMWN7RzJkmkczccNHNHyYRzVOQ0c2XvxHN05LRzhX3Ec5VqJHOmCpRztvw0c8fQ1HPYD9Rz6BM0c/gb9HQI+yR0GJl0dChqRHQ130R0RiikdFZK1HRomHR0dnd0dIbOJHSW0+R0p0NkdLeDRHTFpGR01/dUdOgq1HT5msR1BP80dRXsNHUmLdR1NjkkdUZVdHVWdvR1Z2w0dXckxHWIDMR1mAukdajylHW5FNR1xQDUddV/lHXlqSR19ohUdgaXNHYXFkR2Jy/UdjjLdHZFjyR2WM4EdmlmpHZ5AZR2iHf0dpeeRHanfnR2uEKUdsTy9HbVJlR25TWkdvYs1HcGfPR3Fsykdydn1Hc3uUR3R8lUd1gjZHdoWER3eP60d4Zt1HeW8gR3pyBkd7fhtHfIOrR32ZwUd+nqZIIVH9SCJ7sUgjeHJIJHu4SCWAh0gme0hIJ2roSCheYUgpgIxIKnVRSCt1YEgsUWtILZJiSC5ujEgvdnpIMJGXSDGa6kgyTxBIM39wSDRinEg1e09INpWlSDec6Ug4VnpIOVhZSDqG5Eg7lrxIPE80SD1SJEg+U0pIP1PNSEBT20hBXgZIQmQsSENlkUhEZ39IRWw+SEZsTkhHckhISHKvSElz7UhKdVRIS35BSEyCLEhNhelIToypSE97xEhQkcZIUXFpSFKYEkhTmO9IVGM9SFVmaUhWdWpIV3bkSFh40EhZhUNIWobuSFtTKkhcU1FIXVQmSF5Zg0hfXodIYF98SGFgskhiYklIY2J5SGRiq0hlZZBIZmvUSGdszEhodbJIaXauSGp4kUhredhIbH3LSG1/d0hugKVIb4irSHCKuUhxjLtIcpB/SHOXXkh0mNtIdWoLSHZ8OEh3UJlIeFw+SHlfrkh6Z4dIe2vYSHx0NUh9dwlIfn+OSSGfO0kiZ8pJI3oXSSRTOUkldYtJJprtSSdfZkkogZ1JKYPxSSqAmEkrXzxJLF/FSS11Ykkue0ZJL5A8STBoZ0kxWetJMlqbSTN9EEk0dn5JNYssSTZP9Uk3X2pJOGoZSTlsN0k6bwJJO3TiSTx5aEk9iGhJPopVST+MeUlAXt9JQWPPSUJ1xUlDedJJRILXSUWTKElGkvJJR4ScSUiG7UlJnC1JSlTBSUtfbElMZYxJTW1cSU5wFUlPjKdJUIzTSVGYO0lSZU9JU3T2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TkBb7k5BZZlOQmiBTkNtvE5Ecx9ORXZCTkZ3rU5HehxOSHznTkmCb05KitJOS5B8TkyRz05NlnVOTpgYTk9Sm05QfdFOUVArTlJTmE5TZ5dOVG3LTlVx0E5WdDNOV4HoTliPKk5ZlqNOWpxXTluen05cdGBOXVhBTl5tmU5ffS9OYJheTmFO5E5iTzZOY0+LTmRRt05lUrFOZl26TmdgHE5oc7JOaXk8TmqC005rkjRObJa3Tm2W9k5ulwpOb56XTnCfYk5xZqZOcmt0TnNSF050UqNOdXDITnaIwk53XslOeGBLTnlhkE56byNOe3FJTnx8Pk59ffROfoBvTyGE7k8ikCNPI5MsTyRUQk8lm29PJmrTTydwiU8ojMJPKY3vTyqXMk8rUrRPLFpBTy1eyk8uXwRPL2cXTzBpfE8xaZRPMm1qTzNvD080cmJPNXL8TzZ77U83gAFPOIB+TzmHS086kM5PO1FtTzyek089eYRPPoCLTz+TMk9AitZPQVAtT0JUjE9DinFPRGtqT0WMxE9GgQdPR2DRT0hnoE9JnfJPSk6ZT0tOmE9MnBBPTYprT06FwU9PhWhPUGkAT1Fufk9SeJdPU4FVUCFfDFAiThBQI04VUCROKlAlTjFQJk42UCdOPFAoTj9QKU5CUCpOVlArTlhQLE6CUC1OhVAujGtQL06KUDCCElAxXw1QMk6OUDNOnlA0Tp9QNU6gUDZOolA3TrBQOE6zUDlOtlA6Ts5QO07NUDxOxFA9TsZQPk7CUD9O11BATt5QQU7tUEJO31BDTvdQRE8JUEVPWlBGTzBQR09bUEhPXVBJT1dQSk9HUEtPdlBMT4hQTU+PUE5PmFBPT3tQUE9pUFFPcFBST5FQU09vUFRPhlBVT5ZQVlEYUFdP1FBYT99QWU/OUFpP2FBbT9tQXE/RUF1P2lBeT9BQX0/kUGBP5VBhUBpQYlAoUGNQFFBkUCpQZVAlUGZQBVBnTxxQaE/2UGlQIVBqUClQa1AsUGxP/lBtT+9QblARUG9QBlBwUENQcVBHUHJnA1BzUFVQdFBQUHVQSFB2UFpQd1BWUHhQbFB5UHhQelCAUHtQmlB8UIVQfVC0UH5QslEhUMlRIlDKUSNQs1EkUMJRJVDWUSZQ3lEnUOVRKFDtUSlQ41EqUO5RK1D5USxQ9VEtUQlRLlEBUS9RAlEwURZRMVEVUTJRFFEzURpRNFEhUTVROlE2UTdRN1E8UThRO1E5UT9ROlFAUTtRUlE8UUxRPVFUUT5RYlE/evhRQFFpUUFRalFCUW5RQ1GAUURRglFFVthRRlGMUUdRiVFIUY9RSVGRUUpRk1FLUZVRTFGWUU1RpFFOUaZRT1GiUVBRqVFRUapRUlGrUVNRs1FUUbFRVVGyUVZRsFFXUbVRWFG9UVlRxVFaUclRW1HbUVxR4FFdhlVRXlHpUV9R7VFgUfBRYVH1UWJR/lFjUgRRZFILUWVSFFFmUg5RZ1InUWhSKlFpUi5RalIzUWtSOVFsUk9RbVJEUW5SS1FvUkxRcFJeUXFSVFFyUmpRc1J0UXRSaVF1UnNRdlJ/UXdSfVF4Uo1ReVKUUXpSklF7UnFRfFKIUX1SkVF+j6hSIY+nUiJSrFIjUq1SJFK8UiVStVImUsFSJ1LNUihS11IpUt5SKlLjUitS5lIsmO1SLVLgUi5S81IvUvVSMFL4UjFS+VIyUwZSM1MIUjR1OFI1Uw1SNlMQUjdTD1I4UxVSOVMaUjpTI1I7Uy9SPFMxUj1TM1I+UzhSP1NAUkBTRlJBU0VSQk4XUkNTSVJEU01SRVHWUkZTXlJHU2lSSFNuUklZGFJKU3tSS1N3UkxTglJNU5ZSTlOgUk9TplJQU6VSUVOuUlJTsFJTU7ZSVFPDUlV8ElJWltlSV1PfUlhm/FJZce5SWlPuUltT6FJcU+1SXVP6Ul5UAVJfVD1SYFRAUmFULFJiVC1SY1Q8UmRULlJlVDZSZlQpUmdUHVJoVE5SaVSPUmpUdVJrVI5SbFRfUm1UcVJuVHdSb1RwUnBUklJxVHtSclSAUnNUdlJ0VIRSdVSQUnZUhlJ3VMdSeFSiUnlUuFJ6VKVSe1SsUnxUxFJ9VMhSflSoUyFUq1MiVMJTI1SkUyRUvlMlVLxTJlTYUydU5VMoVOZTKVUPUypVFFMrVP1TLFTuUy1U7VMuVPpTL1TiUzBVOVMxVUBTMlVjUzNVTFM0VS5TNVVcUzZVRVM3VVZTOFVXUzlVOFM6VTNTO1VdUzxVmVM9VYBTPlSvUz9VilNAVZ9TQVV7U0JVflNDVZhTRFWeU0VVrlNGVXxTR1WDU0hVqVNJVYdTSlWoU0tV2lNMVcVTTVXfU05VxFNPVdxTUFXkU1FV1FNSVhRTU1X3U1RWFlNVVf5TVlX9U1dWG1NYVflTWVZOU1pWUFNbcd9TXFY0U11WNlNeVjJTX1Y4U2BWa1NhVmRTYlYvU2NWbFNkVmpTZVaGU2ZWgFNnVopTaFagU2lWlFNqVo9Ta1alU2xWrlNtVrZTbla0U29WwlNwVrxTcVbBU3JWw1NzVsBTdFbIU3VWzlN2VtFTd1bTU3hW11N5Vu5Telb5U3tXAFN8Vv9TfVcEU35XCVQhVwhUIlcLVCNXDVQkVxNUJVcYVCZXFlQnVcdUKFccVClXJlQqVzdUK1c4VCxXTlQtVztULldAVC9XT1QwV2lUMVfAVDJXiFQzV2FUNFd/VDVXiVQ2V5NUN1egVDhXs1Q5V6RUOleqVDtXsFQ8V8NUPVfGVD5X1FQ/V9JUQFfTVEFYClRCV9ZUQ1fjVERYC1RFWBlURlgdVEdYclRIWCFUSVhiVEpYS1RLWHBUTGvAVE1YUlROWD1UT1h5VFBYhVRRWLlUUlifVFNYq1RUWLpUVVjeVFZYu1RXWLhUWFiuVFlYxVRaWNNUW1jRVFxY11RdWNlUXljYVF9Y5VRgWNxUYVjkVGJY31RjWO9UZFj6VGVY+VRmWPtUZ1j8VGhY/VRpWQJUalkKVGtZEFRsWRtUbWimVG5ZJVRvWSxUcFktVHFZMlRyWThUc1k+VHR60lR1WVVUdllQVHdZTlR4WVpUeVlYVHpZYlR7WWBUfFlnVH1ZbFR+WWlVIVl4VSJZgVUjWZ1VJE9eVSVPq1UmWaNVJ1myVShZxlUpWehVKlncVStZjVUsWdlVLVnaVS5aJVUvWh9VMFoRVTFaHFUyWglVM1oaVTRaQFU1WmxVNlpJVTdaNVU4WjZVOVpiVTpaalU7WppVPFq8VT1avlU+WstVP1rCVUBavVVBWuNVQlrXVUNa5lVEWulVRVrWVUZa+lVHWvtVSFsMVUlbC1VKWxZVS1syVUxa0FVNWypVTls2VU9bPlVQW0NVUVtFVVJbQFVTW1FVVFtVVVVbWlVWW1tVV1tlVVhbaVVZW3BVWltzVVtbdVVcW3hVXWWIVV5belVfW4BVYFuDVWFbplViW7hVY1vDVWRbx1VlW8lVZlvUVWdb0FVoW+RVaVvmVWpb4lVrW95VbFvlVW1b61VuW/BVb1v2VXBb81VxXAVVclwHVXNcCFV0XA1VdVwTVXZcIFV3XCJVeFwoVXlcOFV6XDlVe1xBVXxcRlV9XE5VflxTViFcUFYiXE9WI1txViRcbFYlXG5WJk5iVidcdlYoXHlWKVyMVipckVYrXJRWLFmbVi1cq1YuXLtWL1y2VjBcvFYxXLdWMlzFVjNcvlY0XMdWNVzZVjZc6VY3XP1WOFz6Vjlc7VY6XYxWO1zqVjxdC1Y9XRVWPl0XVj9dXFZAXR9WQV0bVkJdEVZDXRRWRF0iVkVdGlZGXRlWR10YVkhdTFZJXVJWSl1OVktdS1ZMXWxWTV1zVk5ddlZPXYdWUF2EVlFdglZSXaJWU12dVlRdrFZVXa5WVl29VlddkFZYXbdWWV28VlpdyVZbXc1WXF3TVl1d0lZeXdZWX13bVmBd61ZhXfJWYl31VmNeC1ZkXhpWZV4ZVmZeEVZnXhtWaF42VmleN1ZqXkRWa15DVmxeQFZtXk5Wbl5XVm9eVFZwXl9WcV5iVnJeZFZzXkdWdF51VnVedlZ2XnpWd568Vnhef1Z5XqBWel7BVntewlZ8XshWfV7QVn5ez1chXtZXIl7jVyNe3VckXtpXJV7bVyZe4lcnXuFXKF7oVyle6VcqXuxXK17xVyxe81ctXvBXLl70Vy9e+FcwXv5XMV8DVzJfCVczX11XNF9cVzVfC1c2XxFXN18WVzhfKVc5Xy1XOl84VztfQVc8X0hXPV9MVz5fTlc/Xy9XQF9RV0FfVldCX1dXQ19ZV0RfYVdFX21XRl9zV0dfd1dIX4NXSV+CV0pff1dLX4pXTF+IV01fkVdOX4dXT1+eV1BfmVdRX5hXUl+gV1NfqFdUX61XVV+8V1Zf1ldXX/tXWF/kV1lf+FdaX/FXW1/dV1xgs1ddX/9XXmAhV19gYFdgYBlXYWAQV2JgKVdjYA5XZGAxV2VgG1dmYBVXZ2ArV2hgJldpYA9XamA6V2tgWldsYEFXbWBqV25gd1dvYF9XcGBKV3FgRldyYE1Xc2BjV3RgQ1d1YGRXdmBCV3dgbFd4YGtXeWBZV3pggVd7YI1XfGDnV31gg1d+YJpYIWCEWCJgm1gjYJZYJGCXWCVgklgmYKdYJ2CLWChg4VgpYLhYKmDgWCtg01gsYLRYLV/wWC5gvVgvYMZYMGC1WDFg2FgyYU1YM2EVWDRhBlg1YPZYNmD3WDdhAFg4YPRYOWD6WDphA1g7YSFYPGD7WD1g8Vg+YQ1YP2EOWEBhR1hBYT5YQmEoWENhJ1hEYUpYRWE/WEZhPFhHYSxYSGE0WElhPVhKYUJYS2FEWExhc1hNYXdYTmFYWE9hWVhQYVpYUWFrWFJhdFhTYW9YVGFlWFVhcVhWYV9YV2FdWFhhU1hZYXVYWmGZWFthllhcYYdYXWGsWF5hlFhfYZpYYGGKWGFhkVhiYatYY2GuWGRhzFhlYcpYZmHJWGdh91hoYchYaWHDWGphxlhrYbpYbGHLWG1/eVhuYc1Yb2HmWHBh41hxYfZYcmH6WHNh9Fh0Yf9YdWH9WHZh/Fh3Yf5YeGIAWHliCFh6YglYe2INWHxiDFh9YhRYfmIbWSFiHlkiYiFZI2IqWSRiLlklYjBZJmIyWSdiM1koYkFZKWJOWSpiXlkrYmNZLGJbWS1iYFkuYmhZL2J8WTBiglkxYolZMmJ+WTNiklk0YpNZNWKWWTZi1Fk3YoNZOGKUWTli11k6YtFZO2K7WTxiz1k9Yv9ZPmLGWT9k1FlAYshZQWLcWUJizFlDYspZRGLCWUVix1lGYptZR2LJWUhjDFlJYu5ZSmLxWUtjJ1lMYwJZTWMIWU5i71lPYvVZUGNQWVFjPllSY01ZU2QcWVRjT1lVY5ZZVmOOWVdjgFlYY6tZWWN2WVpjo1lbY49ZXGOJWV1jn1leY7VZX2NrWWBjaVlhY75ZYmPpWWNjwFlkY8ZZZWPjWWZjyVlnY9JZaGP2WWljxFlqZBZZa2Q0WWxkBlltZBNZbmQmWW9kNllwZR1ZcWQXWXJkKFlzZA9ZdGRnWXVkb1l2ZHZZd2ROWXhlKll5ZJVZemSTWXtkpVl8ZKlZfWSIWX5kvFohZNpaImTSWiNkxVokZMdaJWS7WiZk2FonZMJaKGTxWilk51oqgglaK2TgWixk4VotYqxaLmTjWi9k71owZSxaMWT2WjJk9FozZPJaNGT6WjVlAFo2ZP1aN2UYWjhlHFo5ZQVaOmUkWjtlI1o8ZStaPWU0Wj5lNVo/ZTdaQGU2WkFlOFpCdUtaQ2VIWkRlVlpFZVVaRmVNWkdlWFpIZV5aSWVdWkplclpLZXhaTGWCWk1lg1pOi4paT2WbWlBln1pRZataUmW3WlNlw1pUZcZaVWXBWlZlxFpXZcxaWGXSWlll21paZdlaW2XgWlxl4VpdZfFaXmdyWl9mClpgZgNaYWX7WmJnc1pjZjVaZGY2WmVmNFpmZhxaZ2ZPWmhmRFppZklaamZBWmtmXlpsZl1abWZkWm5mZ1pvZmhacGZfWnFmYlpyZnBac2aDWnRmiFp1Zo5admaJWndmhFp4ZphaeWadWnpmwVp7ZrlafGbJWn1mvlp+ZrxbIWbEWyJmuFsjZtZbJGbaWyVm4FsmZj9bJ2bmWyhm6VspZvBbKmb1Wytm91ssZw9bLWcWWy5nHlsvZyZbMGcnWzGXOFsyZy5bM2c/WzRnNls1Z0FbNmc4WzdnN1s4Z0ZbOWdeWzpnYFs7Z1lbPGdjWz1nZFs+Z4lbP2dwW0BnqVtBZ3xbQmdqW0NnjFtEZ4tbRWemW0ZnoVtHZ4VbSGe3W0ln71tKZ7RbS2fsW0xns1tNZ+lbTme4W09n5FtQZ95bUWfdW1Jn4ltTZ+5bVGe5W1VnzltWZ8ZbV2fnW1hqnFtZaB5bWmhGW1toKVtcaEBbXWhNW15oMltfaE5bYGizW2FoK1tiaFlbY2hjW2Rod1tlaH9bZmifW2doj1toaK1baWiUW2ponVtraJtbbGiDW21qrltuaLlbb2h0W3BotVtxaKBbcmi6W3NpD1t0aI1bdWh+W3ZpAVt3aMpbeGkIW3lo2Ft6aSJbe2kmW3xo4Vt9aQxbfmjNXCFo1FwiaOdcI2jVXCRpNlwlaRJcJmkEXCdo11woaONcKWklXCpo+VwraOBcLGjvXC1pKFwuaSpcL2kaXDBpI1wxaSFcMmjGXDNpeVw0aXdcNWlcXDZpeFw3aWtcOGlUXDlpflw6aW5cO2k5XDxpdFw9aT1cPmlZXD9pMFxAaWFcQWleXEJpXVxDaYFcRGlqXEVpslxGaa5cR2nQXEhpv1xJacFcSmnTXEtpvlxMac5cTVvoXE5pylxPad1cUGm7XFFpw1xSaadcU2ouXFRpkVxVaaBcVmmcXFdplVxYabRcWWneXFpp6FxbagJcXGobXF1p/1xeawpcX2n5XGBp8lxhaedcYmoFXGNpsVxkah5cZWntXGZqFFxnaetcaGoKXGlqElxqasFca2ojXGxqE1xtakRcbmoMXG9qclxwajZccWp4XHJqR1xzamJcdGpZXHVqZlx2akhcd2o4XHhqIlx5apBcemqNXHtqoFx8aoRcfWqiXH5qo10hapddIoYXXSNqu10kasNdJWrCXSZquF0narNdKGqsXSlq3l0qatFdK2rfXSxqql0tatpdLmrqXS9q+10wawVdMYYWXTJq+l0zaxJdNGsWXTWbMV02ax9dN2s4XThrN105dtxdOms5XTuY7l08a0ddPWtDXT5rSV0/a1BdQGtZXUFrVF1Ca1tdQ2tfXURrYV1Fa3hdRmt5XUdrf11Ia4BdSWuEXUprg11La41dTGuYXU1rlV1Oa55dT2ukXVBrql1Ra6tdUmuvXVNrsl1Ua7FdVWuzXVZrt11Xa7xdWGvGXVlry11aa9NdW2vfXVxr7F1da+tdXmvzXV9r711gnr5dYWwIXWJsE11jbBRdZGwbXWVsJF1mbCNdZ2xeXWhsVV1pbGJdamxqXWtsgl1sbI1dbWyaXW5sgV1vbJtdcGx+XXFsaF1ybHNdc2ySXXRskF11bMRddmzxXXds0114bL1deWzXXXpsxV17bN1dfGyuXX1ssV1+bL5eIWy6XiJs214jbO9eJGzZXiVs6l4mbR9eJ4hNXihtNl4pbSteKm09XittOF4sbRleLW01Xi5tM14vbRJeMG0MXjFtY14ybZNeM21kXjRtWl41bXleNm1ZXjdtjl44bZVeOW/kXjpthV47bflePG4VXj1uCl4+bbVeP23HXkBt5l5BbbheQm3GXkNt7F5Ebd5eRW3MXkZt6F5HbdJeSG3FXklt+l5KbdleS23kXkxt1V5NbepeTm3uXk9uLV5Qbm5eUW4uXlJuGV5TbnJeVG5fXlVuPl5WbiNeV25rXlhuK15ZbnZeWm5NXltuH15cbkNeXW46Xl5uTl5fbiReYG7/XmFuHV5ibjheY26CXmRuql5lbpheZm7JXmdut15obtNeaW69Xmpur15rbsRebG6yXm1u1F5ubtVeb26PXnBupV5xbsJecm6fXnNvQV50bxFedXBMXnZu7F53bvheeG7+XnlvP156bvJee28xXnxu7159bzJefm7MXyFvPl8ibxNfI273XyRvhl8lb3pfJm94XydvgV8ob4BfKW9vXypvW18rb/NfLG9tXy1vgl8ub3xfL29YXzBvjl8xb5FfMm/CXzNvZl80b7NfNW+jXzZvoV83b6RfOG+5Xzlvxl86b6pfO2/fXzxv1V89b+xfPm/UXz9v2F9Ab/FfQW/uX0Jv219DcAlfRHALX0Vv+l9GcBFfR3ABX0hwD19Jb/5fSnAbX0twGl9Mb3RfTXAdX05wGF9PcB9fUHAwX1FwPl9ScDJfU3BRX1RwY19VcJlfVnCSX1dwr19YcPFfWXCsX1pwuF9bcLNfXHCuX11w319ecMtfX3DdX2Bw2V9hcQlfYnD9X2NxHF9kcRlfZXFlX2ZxVV9ncYhfaHFmX2lxYl9qcUxfa3FWX2xxbF9tcY9fbnH7X29xhF9wcZVfcXGoX3JxrF9zcddfdHG5X3Vxvl92cdJfd3HJX3hx1F95cc5fenHgX3tx7F98cedffXH1X35x/GAhcflgInH/YCNyDWAkchBgJXIbYCZyKGAnci1gKHIsYClyMGAqcjJgK3I7YCxyPGAtcj9gLnJAYC9yRmAwcktgMXJYYDJydGAzcn5gNHKCYDVygWA2codgN3KSYDhylmA5cqJgOnKnYDtyuWA8crJgPXLDYD5yxmA/csRgQHLOYEFy0mBCcuJgQ3LgYERy4WBFcvlgRnL3YEdQD2BIcxdgSXMKYEpzHGBLcxZgTHMdYE1zNGBOcy9gT3MpYFBzJWBRcz5gUnNOYFNzT2BUnthgVXNXYFZzamBXc2hgWHNwYFlzeGBac3VgW3N7YFxzemBdc8hgXnOzYF9zzmBgc7tgYXPAYGJz5WBjc+5gZHPeYGV0omBmdAVgZ3RvYGh0JWBpc/hganQyYGt0OmBsdFVgbXQ/YG50X2BvdFlgcHRBYHF0XGBydGlgc3RwYHR0Y2B1dGpgdnR2YHd0fmB4dItgeXSeYHp0p2B7dMpgfHTPYH101GB+c/FhIXTgYSJ042EjdOdhJHTpYSV07mEmdPJhJ3TwYSh08WEpdPhhKnT3YSt1BGEsdQNhLXUFYS51DGEvdQ5hMHUNYTF1FWEydRNhM3UeYTR1JmE1dSxhNnU8YTd1RGE4dU1hOXVKYTp1SWE7dVthPHVGYT11WmE+dWlhP3VkYUB1Z2FBdWthQnVtYUN1eGFEdXZhRXWGYUZ1h2FHdXRhSHWKYUl1iWFKdYJhS3WUYUx1mmFNdZ1hTnWlYU91o2FQdcJhUXWzYVJ1w2FTdbVhVHW9YVV1uGFWdbxhV3WxYVh1zWFZdcphWnXSYVt12WFcdeNhXXXeYV51/mFfdf9hYHX8YWF2AWFidfBhY3X6YWR18mFldfNhZnYLYWd2DWFodglhaXYfYWp2J2FrdiBhbHYhYW12ImFudiRhb3Y0YXB2MGFxdjthcnZHYXN2SGF0dkZhdXZcYXZ2WGF3dmFheHZiYXl2aGF6dmlhe3ZqYXx2Z2F9dmxhfnZwYiF2cmIidnZiI3Z4YiR2fGIldoBiJnaDYid2iGIodotiKXaOYip2lmIrdpNiLHaZYi12mmIudrBiL3a0YjB2uGIxdrliMna6YjN2wmI0ds1iNXbWYjZ20mI3dt5iOHbhYjl25WI6dudiO3bqYjyGL2I9dvtiPncIYj93B2JAdwRiQXcpYkJ3JGJDdx5iRHclYkV3JmJGdxtiR3c3Ykh3OGJJd0diSndaYkt3aGJMd2tiTXdbYk53ZWJPd39iUHd+YlF3eWJSd45iU3eLYlR3kWJVd6BiVneeYld3sGJYd7ZiWXe5Ylp3v2Jbd7xiXHe9Yl13u2Jed8diX3fNYmB312Jhd9piYnfcYmN342Jkd+5iZXf8YmZ4DGJneBJiaHkmYml4IGJqeSpia3hFYmx4jmJteHRibniGYm94fGJweJpicXiMYnJ4o2JzeLVidHiqYnV4r2J2eNFid3jGYnh4y2J5eNRieni+Ynt4vGJ8eMVifXjKYn547GMheOdjInjaYyN4/WMkePRjJXkHYyZ5EmMneRFjKHkZYyl5LGMqeStjK3lAYyx5YGMteVdjLnlfYy95WmMweVVjMXlTYzJ5emMzeX9jNHmKYzV5nWM2eadjN59LYzh5qmM5ea5jOnmzYzt5uWM8ebpjPXnJYz551WM/eedjQHnsY0F54WNCeeNjQ3oIY0R6DWNFehhjRnoZY0d6IGNIeh9jSXmAY0p6MWNLejtjTHo+Y016N2NOekNjT3pXY1B6SWNRemFjUnpiY1N6aWNUn51jVXpwY1Z6eWNXen1jWHqIY1l6l2NaepVjW3qYY1x6lmNdeqljXnrIY196sGNgerZjYXrFY2J6xGNjer9jZJCDY2V6x2NmespjZ3rNY2h6z2NpetVjanrTY2t62WNsetpjbXrdY2564WNveuJjcHrmY3F67WNyevBjc3sCY3R7D2N1ewpjdnsGY3d7M2N4exhjeXsZY3p7HmN7ezVjfHsoY317NmN+e1BkIXt6ZCJ7BGQje01kJHsLZCV7TGQme0VkJ3t1ZCh7ZWQpe3RkKntnZCt7cGQse3FkLXtsZC57bmQve51kMHuYZDF7n2Qye41kM3ucZDR7mmQ1e4tkNnuSZDd7j2Q4e11kOXuZZDp7y2Q7e8FkPHvMZD17z2Q+e7RkP3vGZEB73WRBe+lkQnwRZEN8FGREe+ZkRXvlZEZ8YGRHfABkSHwHZEl8E2RKe/NkS3v3ZEx8F2RNfA1kTnv2ZE98I2RQfCdkUXwqZFJ8H2RTfDdkVHwrZFV8PWRWfExkV3xDZFh8VGRZfE9kWnxAZFt8UGRcfFhkXXxfZF58ZGRffFZkYHxlZGF8bGRifHVkY3yDZGR8kGRlfKRkZnytZGd8omRofKtkaXyhZGp8qGRrfLNkbHyyZG18sWRufK5kb3y5ZHB8vWRxfMBkcnzFZHN8wmR0fNhkdXzSZHZ83GR3fOJkeJs7ZHl872R6fPJke3z0ZHx89mR9fPpkfn0GZSF9AmUifRxlI30VZSR9CmUlfUVlJn1LZSd9LmUofTJlKX0/ZSp9NWUrfUZlLH1zZS19VmUufU5lL31yZTB9aGUxfW5lMn1PZTN9Y2U0fZNlNX2JZTZ9W2U3fY9lOH19ZTl9m2U6fbplO32uZTx9o2U9fbVlPn3HZT99vWVAfatlQX49ZUJ9omVDfa9lRH3cZUV9uGVGfZ9lR32wZUh92GVJfd1lSn3kZUt93mVMfftlTX3yZU594WVPfgVlUH4KZVF+I2VSfiFlU34SZVR+MWVVfh9lVn4JZVd+C2VYfiJlWX5GZVp+ZmVbfjtlXH41ZV1+OWVefkNlX343ZWB+MmVhfjplYn5nZWN+XWVkflZlZX5eZWZ+WWVnflplaH55ZWl+amVqfmlla358ZWx+e2VtfoNlbn3VZW9+fWVwj65lcX5/ZXJ+iGVzfolldH6MZXV+kmV2fpBld36TZXh+lGV5fpZlen6OZXt+m2V8fpxlfX84ZX5/OmYhf0VmIn9MZiN/TWYkf05mJX9QZiZ/UWYnf1VmKH9UZil/WGYqf19mK39gZix/aGYtf2lmLn9nZi9/eGYwf4JmMX+GZjJ/g2Yzf4hmNH+HZjV/jGY2f5RmN3+eZjh/nWY5f5pmOn+jZjt/r2Y8f7JmPX+5Zj5/rmY/f7ZmQH+4ZkGLcWZCf8VmQ3/GZkR/ymZFf9VmRn/UZkd/4WZIf+ZmSX/pZkp/82ZLf/lmTJjcZk2ABmZOgARmT4ALZlCAEmZRgBhmUoAZZlOAHGZUgCFmVYAoZlaAP2ZXgDtmWIBKZlmARmZagFJmW4BYZlyAWmZdgF9mXoBiZl+AaGZggHNmYYByZmKAcGZjgHZmZIB5ZmWAfWZmgH9mZ4CEZmiAhmZpgIVmaoCbZmuAk2ZsgJpmbYCtZm5RkGZvgKxmcIDbZnGA5WZygNlmc4DdZnSAxGZ1gNpmdoDWZneBCWZ4gO9meYDxZnqBG2Z7gSlmfIEjZn2BL2Z+gUtnIZaLZyKBRmcjgT5nJIFTZyWBUWcmgPxnJ4FxZyiBbmcpgWVnKoFmZyuBdGcsgYNnLYGIZy6BimcvgYBnMIGCZzGBoGcygZVnM4GkZzSBo2c1gV9nNoGTZzeBqWc4gbBnOYG1ZzqBvmc7gbhnPIG9Zz2BwGc+gcJnP4G6Z0CByWdBgc1nQoHRZ0OB2WdEgdhnRYHIZ0aB2mdHgd9nSIHgZ0mB52dKgfpnS4H7Z0yB/mdNggFnToICZ0+CBWdQggdnUYIKZ1KCDWdTghBnVIIWZ1WCKWdWgitnV4I4Z1iCM2dZgkBnWoJZZ1uCWGdcgl1nXYJaZ16CX2dfgmRnYIJiZ2GCaGdigmpnY4JrZ2SCLmdlgnFnZoJ3Z2eCeGdogn5naYKNZ2qCkmdrgqtnbIKfZ22Cu2dugqxnb4LhZ3CC42dxgt9ncoLSZ3OC9Gd0gvNndYL6Z3aDk2d3gwNneIL7Z3mC+Wd6gt5ne4MGZ3yC3Gd9gwlnfoLZaCGDNWgigzRoI4MWaCSDMmglgzFoJoNAaCeDOWgog1BoKYNFaCqDL2grgytoLIMXaC2DGGgug4VoL4OaaDCDqmgxg59oMoOiaDODlmg0gyNoNYOOaDaDh2g3g4poOIN8aDmDtWg6g3NoO4N1aDyDoGg9g4loPoOoaD+D9GhAhBNoQYPraEKDzmhDg/1oRIQDaEWD2GhGhAtoR4PBaEiD92hJhAdoSoPgaEuD8mhMhA1oTYQiaE6EIGhPg71oUIQ4aFGFBmhSg/toU4RtaFSEKmhVhDxoVoVaaFeEhGhYhHdoWYRraFqErWhbhG5oXISCaF2EaWhehEZoX4QsaGCEb2hhhHloYoQ1aGOEymhkhGJoZYS5aGaEv2hnhJ9oaITZaGmEzWhqhLtoa4TaaGyE0GhthMFoboTGaG+E1mhwhKFocYUhaHKE/2hzhPRodIUXaHWFGGh2hSxod4UfaHiFFWh5hRRoeoT8aHuFQGh8hWNofYVYaH6FSGkhhUFpIoYCaSOFS2kkhVVpJYWAaSaFpGknhYhpKIWRaSmFimkqhahpK4VtaSyFlGkthZtpLoXqaS+Fh2kwhZxpMYV3aTKFfmkzhZBpNIXJaTWFumk2hc9pN4W5aTiF0Gk5hdVpOoXdaTuF5Wk8hdxpPYX5aT6GCmk/hhNpQIYLaUGF/mlChfppQ4YGaUSGImlFhhppRoYwaUeGP2lIhk1pSU5VaUqGVGlLhl9pTIZnaU2GcWlOhpNpT4ajaVCGqWlRhqppUoaLaVOGjGlUhrZpVYavaVaGxGlXhsZpWIawaVmGyWlaiCNpW4araVyG1Gldht5pXobpaV+G7Glght9pYYbbaWKG72ljhxJpZIcGaWWHCGlmhwBpZ4cDaWiG+2lphxFpaocJaWuHDWlshvlpbYcKaW6HNGlvhz9pcIc3aXGHO2lyhyVpc4cpaXSHGml1h2BpdodfaXeHeGl4h0xpeYdOaXqHdGl7h1dpfIdoaX2Hbml+h1lqIYdTaiKHY2ojh2pqJIgFaiWHomomh59qJ4eCaiiHr2oph8tqKoe9aiuHwGosh9BqLZbWai6Hq2ovh8RqMIezajGHx2oyh8ZqM4e7ajSH72o1h/JqNofgajeID2o4iA1qOYf+ajqH9mo7h/dqPIgOaj2H0mo+iBFqP4gWakCIFWpBiCJqQoghakOIMWpEiDZqRYg5akaIJ2pHiDtqSIhEakmIQmpKiFJqS4hZakyIXmpNiGJqTohrak+IgWpQiH5qUYiealKIdWpTiH1qVIi1alWIcmpWiIJqV4iXaliIkmpZiK5qWoiZaluIompciI1qXYikal6IsGpfiL9qYIixamGIw2piiMRqY4jUamSI2GpliNlqZojdameI+WpoiQJqaYj8amqI9GpriOhqbIjyam2JBGpuiQxqb4kKanCJE2pxiUNqcokeanOJJWp0iSpqdYkranaJQWp3iURqeIk7anmJNmp6iThqe4lManyJHWp9iWBqfoleayGJZmsiiWRrI4ltaySJamsliW9rJol0ayeJd2soiX5rKYmDayqJiGsriYprLImTay2JmGsuiaFrL4mpazCJpmsxiaxrMomvazOJsms0ibprNYm9azaJv2s3icBrOInaazmJ3Gs6id1rO4nnazyJ9Gs9ifhrPooDaz+KFmtAihBrQYoMa0KKG2tDih1rRIola0WKNmtGikFrR4pba0iKUmtJikZrSopIa0uKfGtMim1rTYpsa06KYmtPioVrUIqCa1GKhGtSiqhrU4qha1SKkWtViqVrVoqma1eKmmtYiqNrWYrEa1qKzWtbisJrXIraa12K62teivNrX4rna2CK5GthivFrYosUa2OK4GtkiuJrZYr3a2aK3mtnittraIsMa2mLB2tqixpra4rha2yLFmttixBrbosXa2+LIGtwizNrcZera3KLJmtziytrdIs+a3WLKGt2i0Frd4tMa3iLT2t5i05reotJa3uLVmt8i1trfYtaa36La2whi19sIotsbCOLb2wki3RsJYt9bCaLgGwni4xsKIuObCmLkmwqi5NsK4uWbCyLmWwti5psLow6bC+MQWwwjD9sMYxIbDKMTGwzjE5sNIxQbDWMVWw2jGJsN4xsbDiMeGw5jHpsOoyCbDuMiWw8jIVsPYyKbD6MjWw/jI5sQIyUbEGMfGxCjJhsQ2IdbESMrWxFjKpsRoy9bEeMsmxIjLNsSYyubEqMtmxLjMhsTIzBbE2M5GxOjONsT4zabFCM/WxRjPpsUoz7bFONBGxUjQVsVY0KbFaNB2xXjQ9sWI0NbFmNEGxan05sW40TbFyMzWxdjRRsXo0WbF+NZ2xgjW1sYY1xbGKNc2xjjYFsZI2ZbGWNwmxmjb5sZ426bGiNz2xpjdpsao3WbGuNzGxsjdtsbY3LbG6N6mxvjetscI3fbHGN42xyjfxsc44IbHSOCWx1jf9sdo4dbHeOHmx4jhBseY4fbHqOQmx7jjVsfI4wbH2ONGx+jkptIY5HbSKOSW0jjkxtJI5QbSWOSG0mjlltJ45kbSiOYG0pjiptKo5jbSuOVW0sjnZtLY5ybS6OfG0vjoFtMI6HbTGOhW0yjoRtM46LbTSOim01jpNtNo6RbTeOlG04jpltOY6qbTqOoW07jqxtPI6wbT2Oxm0+jrFtP46+bUCOxW1BjshtQo7LbUOO221EjuNtRY78bUaO+21HjuttSI7+bUmPCm1KjwVtS48VbUyPEm1NjxltTo8TbU+PHG1Qjx9tUY8bbVKPDG1TjyZtVI8zbVWPO21WjzltV49FbViPQm1Zjz5tWo9MbVuPSW1cj0ZtXY9ObV6PV21fj1xtYI9ibWGPY21ij2RtY4+cbWSPn21lj6NtZo+tbWePr21oj7dtaY/abWqP5W1rj+JtbI/qbW2P721ukIdtb4/0bXCQBW1xj/ltco/6bXOQEW10kBVtdZAhbXaQDW13kB5teJAWbXmQC216kCdte5A2bXyQNW19kDltfo/4biGQT24ikFBuI5BRbiSQUm4lkA5uJpBJbieQPm4okFZuKZBYbiqQXm4rkGhuLJBvbi2Qdm4ulqhuL5BybjCQgm4xkH1uMpCBbjOQgG40kIpuNZCJbjaQj243kKhuOJCvbjmQsW46kLVuO5DibjyQ5G49YkhuPpDbbj+RAm5AkRJuQZEZbkKRMm5DkTBuRJFKbkWRVm5GkVhuR5FjbkiRZW5JkWluSpFzbkuRcm5MkYtuTZGJbk6Rgm5PkaJuUJGrblGRr25SkapuU5G1blSRtG5VkbpuVpHAbleRwW5YkcluWZHLblqR0G5bkdZuXJHfbl2R4W5ekdtuX5H8bmCR9W5hkfZuYpIebmOR/25kkhRuZZIsbmaSFW5nkhFuaJJebmmSV25qkkVua5JJbmySZG5tkkhubpKVbm+SP25wkktucZJQbnKSnG5zkpZudJKTbnWSm252klpud5LPbniSuW55krduepLpbnuTD258kvpufZNEbn6TLm8hkxlvIpMibyOTGm8kkyNvJZM6byaTNW8nkztvKJNcbymTYG8qk3xvK5NubyyTVm8tk7BvLpOsby+TrW8wk5RvMZO5bzKT1m8zk9dvNJPobzWT5W82k9hvN5PDbziT3W85k9BvOpPIbzuT5G88lBpvPZQUbz6UE28/lANvQJQHb0GUEG9ClDZvQ5Qrb0SUNW9FlCFvRpQ6b0eUQW9IlFJvSZREb0qUW29LlGBvTJRib02UXm9OlGpvT5Ipb1CUcG9RlHVvUpR3b1OUfW9UlFpvVZR8b1aUfm9XlIFvWJR/b1mVgm9alYdvW5WKb1yVlG9dlZZvXpWYb1+VmW9glaBvYZWob2KVp29jla1vZJW8b2WVu29mlblvZ5W+b2iVym9pb/ZvapXDb2uVzW9slcxvbZXVb26V1G9vldZvcJXcb3GV4W9yleVvc5Xib3SWIW91lihvdpYub3eWL294lkJveZZMb3qWT297lktvfJZ3b32WXG9+ll5wIZZdcCKWX3AjlmZwJJZycCWWbHAmlo1wJ5aYcCiWlXAplpdwKpaqcCuWp3AslrFwLZaycC6WsHAvlrRwMJa2cDGWuHAylrlwM5bOcDSWy3A1lslwNpbNcDeJTXA4ltxwOZcNcDqW1XA7lvlwPJcEcD2XBnA+lwhwP5cTcECXDnBBlxFwQpcPcEOXFnBElxlwRZckcEaXKnBHlzBwSJc5cEmXPXBKlz5wS5dEcEyXRnBNl0hwTpdCcE+XSXBQl1xwUZdgcFKXZHBTl2ZwVJdocFVS0nBWl2twV5dxcFiXeXBZl4VwWpd8cFuXgXBcl3pwXZeGcF6Xi3Bfl49wYJeQcGGXnHBil6hwY5emcGSXo3Bll7NwZpe0cGeXw3Bol8ZwaZfIcGqXy3Brl9xwbJftcG2fT3Bul/Jwb3rfcHCX9nBxl/VwcpgPcHOYDHB0mDhwdZgkcHaYIXB3mDdweJg9cHmYRnB6mE9we5hLcHyYa3B9mG9wfphwcSGYcXEimHRxI5hzcSSYqnElmK9xJpixcSeYtnEomMRxKZjDcSqYxnErmOlxLJjrcS2ZA3EumQlxL5kScTCZFHExmRhxMpkhcTOZHXE0mR5xNZkkcTaZIHE3mSxxOJkucTmZPXE6mT5xO5lCcTyZSXE9mUVxPplQcT+ZS3FAmVFxQZlScUKZTHFDmVVxRJmXcUWZmHFGmaVxR5mtcUiZrnFJmbxxSpnfcUuZ23FMmd1xTZnYcU6Z0XFPme1xUJnucVGZ8XFSmfJxU5n7cVSZ+HFVmgFxVpoPcVeaBXFYmeJxWZoZcVqaK3FbmjdxXJpFcV2aQnFemkBxX5pDcWCaPnFhmlVxYppNcWOaW3FkmldxZZpfcWaaYnFnmmVxaJpkcWmaaXFqmmtxa5pqcWyarXFtmrBxbpq8cW+awHFwms9xcZrRcXKa03FzmtRxdJrecXWa33F2muJxd5rjcXia5nF5mu9xeprrcXua7nF8mvRxfZrxcX6a93IhmvtyIpsGciObGHIkmxpyJZsfciabInInmyNyKJslcimbJ3IqmyhyK5spciybKnItmy5yLpsvci+bMnIwm0RyMZtDcjKbT3Izm01yNJtOcjWbUXI2m1hyN5t0cjibk3I5m4NyOpuRcjublnI8m5dyPZufcj6boHI/m6hyQJu0ckGbwHJCm8pyQ5u5ckSbxnJFm89yRpvRckeb0nJIm+NySZvickqb5HJLm9RyTJvhck2cOnJOm/JyT5vxclCb8HJRnBVyUpwUclOcCXJUnBNyVZwMclacBnJXnAhyWJwSclmcCnJanARyW5wuclycG3JdnCVyXpwkcl+cIXJgnDByYZxHcmKcMnJjnEZyZJw+cmWcWnJmnGByZ5xncmicdnJpnHhyapzncmuc7HJsnPBybZ0Jcm6dCHJvnOtycJ0DcnGdBnJynSpyc50mcnSdr3J1nSNydp0fcnedRHJ4nRVyeZ0ScnqdQXJ7nT9yfJ0+cn2dRnJ+nUhzIZ1dcyKdXnMjnWRzJJ1RcyWdUHMmnVlzJ51ycyidiXMpnYdzKp2rcyudb3MsnXpzLZ2acy6dpHMvnalzMJ2yczGdxHMyncFzM527czSduHM1nbpzNp3Gczedz3M4ncJzOZ3Zczqd03M7nfhzPJ3mcz2d7XM+ne9zP539c0CeGnNBnhtzQp4ec0OedXNEnnlzRZ59c0aegXNHnohzSJ6Lc0mejHNKnpJzS56Vc0yekXNNnp1zTp6lc0+eqXNQnrhzUZ6qc1KerXNTl2FzVJ7Mc1WeznNWns9zV57Qc1ie1HNZntxzWp7ec1ue3XNcnuBzXZ7lc16e6HNfnu9zYJ70c2Ge9nNinvdzY575c2Se+3NlnvxzZp79c2efB3NonwhzaXa3c2qfFXNrnyFzbJ8sc22fPnNun0pzb59Sc3CfVHNxn2Nzcp9fc3OfYHN0n2FzdZ9mc3afZ3N3n2xzeJ9qc3mfd3N6n3Jze592c3yflXN9n5xzfp+gdCFYL3Qiacd0I5BZdCR0ZHQlUdx0JnGZ");    
    
    var JISX0201 = {};
    var JISX0208 = {};
    var JISX0212 = {};
    var CP936 = {};
    
    makeTableFromBin( binCP936, CP936 );
    makeTableFromBin( binJISX0201, JISX0201 );
    makeTableFromBin( binJISX0208, JISX0208  );
    makeTableFromBin( binJISX0212, JISX0212 );
    
    unicode.fromEUCJP = function( str, fallback ) {
        str = checkBinary(str);
        var i = 0,
            notHighBits = ~0x8080,
            ch1, ch2, ch3,
            codePoints = [],
            codePoint,
            error = false,
            len = str.length;

        fallback = checkFallback(fallback);
        
        for( i = 0; i < len; ++i ) {
            ch1 = str.charCodeAt(i);
            error = false;
            
            if( ch1 <= 0x7f ) {
                codePoints.push(ch1);
            }
            else if( ch1 === 0x8e ) {
                if( i + 1 >= len ) {
                    error = true;
                }
                else {
                    ch2 = str.charCodeAt(i+1);
                
                    if( ch2 <= 0x7F || 
                        0x80 <= ch2 && ch2 <= 0x9f ||
                        0xe0 <= ch2 && ch2 <= 0xff ) {
                        error = true;                
                    }
                    else {
                        codePoints.push( JISX0201[ch2]);
                        i++;
                    }
                }
                
            }
            else if( ch1 === 0x8f ) {
                if( i + 2 >= len ) {
                    error = true;
                }
                else {
                    ch2 = str.charCodeAt(i+1);
                    ch3 = str.charCodeAt(i+2);
                    codePoint = JISX0212[((( ch2 << 8 ) | ch3) & notHighBits)];
                    if( !codePoint ) {
                        error = true;
                    }
                    else {
                        codePoints.push( codePoint );
                        i+=2;
                    }
                }
            }
            else {
                if( i + 1 >= len ) {
                    error = true;
                }
                else {
                    ch2 = str.charCodeAt(i+1);

                    codePoint = JISX0208[((( ch1 << 8 ) | ch2) & notHighBits)];
                    if( !codePoint ) {
                        error = true;
                    }
                    else {
                        codePoints.push( codePoint );
                        i++;
                    }
                }
            }
            
            if( error ) {
                if( fallback === unicode.REPLACEMENT_FALLBACK ) {
                    codePoints.push( 0x003f );
                }
                else if( fallback === unicode.ERROR_FALLBACK ) {
                    throw new DecoderError( "Invalid byte sequence" );
                }
            }
        }
        
        return unicode.from.apply( String, codePoints ); 
    };
    var cp936key = {};
    
    unicode.fromCP936 = function( str, fallback ) {
        return unicode.fromShiftJIS( str, fallback, cp936key );
    }
    
    unicode.fromShiftJIS = function( str, fallback, key ) {
        str = checkBinary(str);
        var i = 0,
            ch1, ch2,
            codePoints = [],
            codePoint,
            error = false,
            j1, j2,
            s1, s2,
            len = str.length;
        fallback = checkFallback(fallback);
        
        for( i = 0; i < len; ++i ) {
            ch1 = str.charCodeAt(i);
            error = false;
            
            if( ch1 <= 0x7F ) {
                if( ch1 === 0x5C ) {
                    codePoint = 0x00A5;
                }
                else if( ch1 === 0x7E ) {
                    codePoint = 0x203E;
                }
                else {
                    codePoint = ch1;
                }
                codePoints.push( codePoint );
            }
            else if( 0xa1 <= ch1 && ch1 <= 0xdf ) {
                codePoint = JISX0201[ch1];
                codePoints.push( codePoint );
            }
            else if( 0x81 <= ch1 && ch1 <= 0x9F ||
                     0xE0 <= ch1 && ch1 <= 0xEF ) {
                     
                ch2 = str.charCodeAt(i + 1 );
                
                if( i + 1 >= len ) {
                    error = true;
                }
                else if( 0x00 <= ch2 && ch2 <= 0x3f ||
                        ch2 === 0x7F ||
                        0xFD <= ch2 && ch2 <= 0xFF ) {
                    error = true;
                }
                else {
                    j1 = ch1;
                    j2 = ch2;
                    
                    s1 = j1;
                    if( s1 < 0xa0 ) {
                        s1 -= 0x81;
                    }
                    else {
                        s1 -= 0xc1;
                    }
                    
                    s1 <<= 1;
                    
                    s1 += 0x21;
                    
                    s2 = j2;
                    
                    if( s2 < 0x9f ) {
                        if( s2 < 0x7f ) {
                            s2++;
                        }
                        s2 -=0x20;
                    }
                    else {
                        s1++;
                        s2 -= 0x7e;
                    }
                    
                    codePoint = JISX0208[(( s1 << 8 ) | s2 )];

                    if( !codePoint ) {
                        //Check if this is actually CP936
                        if( key === cp936key ) {
                            codePoint === CP936[(( s1 << 8 ) | s2 )];
                            if( codePoint ) {
                                i++;
                                codePoints.push( codePoint );
                                continue;
                            }
                        }
                        error = true;
                    }
                    else {
                        i++;
                        codePoints.push( codePoint );
                    }
                    
                }
            }
            else {
                error = true;
            }
            
            if( error ) {
                if( fallback === unicode.REPLACEMENT_FALLBACK ) {
                    codePoints.push( 0x003f );
                }
                else if( fallback === unicode.ERROR_FALLBACK ) {
                    throw new DecoderError( "Invalid byte sequence" );
                }
            }            
        }
        return unicode.from.apply( String, codePoints ); 
    };
  
    unicode.reinterpret = function( from, to, str ) {
        return unicode["from"+from](unicode["to"+to](str));
    };

    (function(){

        var toArray = [].slice;


        unicode.toByteArray = function (str) {
            str = checkBinary(str);
            var i,
                len = str.length,
                byteArr = new ByteArray(len);

            for( i = 0; i < len; ++i ) {
                byteArr[i] = str.charCodeAt(i);
            }

            return byteArr;
        };

        unicode.fromByteArray = function( arr ) {
           return String.fromCharCode.apply( String, arr );
        };

    })();

    (function(){

        var rpercent = /%([a-fA-F0-9]{2})/g,

            replacer = function( full, m1 ) {
                return String.fromCharCode(parseInt( m1, 16 ));
            };

        function percentEncode( num ) {
            var str = num.toString(16);
            return "%" + (str.length < 2 ? "0" + str : str).toUpperCase(); 
        }

        unicode.toUriEncoding = function(str, cb, fallback) {
            var ret = [],
                i = 0,
                code,
                len = str.length;
                
            str = (cb || unicode.toUTF8)(str, fallback);
            
            while( !isNaN( code = str.charCodeAt(i++) ) ) {
                if(
                    65 <= code && code <= 90 ||
                    97 <= code && code <= 122 ||
                    48 <= code && code <= 57 ||
                    45 <= code && code <= 46 ||
                    code === 95 ||
                    code === 126
                ) {
                    ret.push( str.charAt( i-1 ) );
                }
                else {
                    ret.push( percentEncode( code ) );
                }
            }

            return ret.join("");
        };

        unicode.fromUriEncoding = function(str, cb, fallback) {
            return (cb || unicode.fromUTF8)(str.replace(rpercent, replacer), fallback);
        };

    })();
    
    (function() {
    
        var entitiesMap = {
            "quot": 34,
            "amp": 38,
            "lt": 60,
            "gt": 62,
            "apos": 39,
            "nbsp": 160,
            "iexcl": 161,
            "cent": 162,
            "pound": 163,
            "curren": 164,
            "yen": 165,
            "brvbar": 166,
            "sect": 167,
            "uml": 168,
            "copy": 169,
            "ordf": 170,
            "laquo": 171,
            "not": 172,
            "shy": 173,
            "reg": 174,
            "macr": 175,
            "deg": 176,
            "plusmn": 177,
            "sup2": 178,
            "sup3": 179,
            "acute": 180,
            "micro": 181,
            "para": 182,
            "middot": 183,
            "cedil": 184,
            "sup1": 185,
            "ordm": 186,
            "raquo": 187,
            "frac14": 188,
            "frac12": 189,
            "frac34": 190,
            "iquest": 191,
            "Agrave": 192,
            "Aacute": 193,
            "Acirc": 194,
            "Atilde": 195,
            "Auml": 196,
            "Aring": 197,
            "AElig": 198,
            "Ccedil": 199,
            "Egrave": 200,
            "Eacute": 201,
            "Ecirc": 202,
            "Euml": 203,
            "Igrave": 204,
            "Iacute": 205,
            "Icirc": 206,
            "Iuml": 207,
            "ETH": 208,
            "Ntilde": 209,
            "Ograve": 210,
            "Oacute": 211,
            "Ocirc": 212,
            "Otilde": 213,
            "Ouml": 214,
            "times": 215,
            "Oslash": 216,
            "Ugrave": 217,
            "Uacute": 218,
            "Ucirc": 219,
            "Uuml": 220,
            "Yacute": 221,
            "THORN": 222,
            "szlig": 223,
            "agrave": 224,
            "aacute": 225,
            "acirc": 226,
            "atilde": 227,
            "auml": 228,
            "aring": 229,
            "aelig": 230,
            "ccedil": 231,
            "egrave": 232,
            "eacute": 233,
            "ecirc": 234,
            "euml": 235,
            "igrave": 236,
            "iacute": 237,
            "icirc": 238,
            "iuml": 239,
            "eth": 240,
            "ntilde": 241,
            "ograve": 242,
            "oacute": 243,
            "ocirc": 244,
            "otilde": 245,
            "ouml": 246,
            "divide": 247,
            "oslash": 248,
            "ugrave": 249,
            "uacute": 250,
            "ucirc": 251,
            "uuml": 252,
            "yacute": 253,
            "thorn": 254,
            "yuml": 255,
            "OElig": 338,
            "oelig": 339,
            "Scaron": 352,
            "scaron": 353,
            "Yuml": 376,
            "fnof": 402,
            "circ": 710,
            "tilde": 732,
            "Alpha": 913,
            "Beta": 914,
            "Gamma": 915,
            "Delta": 916,
            "Epsilon": 917,
            "Zeta": 918,
            "Eta": 919,
            "Theta": 920,
            "Iota": 921,
            "Kappa": 922,
            "Lambda": 923,
            "Mu": 924,
            "Nu": 925,
            "Xi": 926,
            "Omicron": 927,
            "Pi": 928,
            "Rho": 929,
            "Sigma": 931,
            "Tau": 932,
            "Upsilon": 933,
            "Phi": 934,
            "Chi": 935,
            "Psi": 936,
            "Omega": 937,
            "alpha": 945,
            "beta": 946,
            "gamma": 947,
            "delta": 948,
            "epsilon": 949,
            "zeta": 950,
            "eta": 951,
            "theta": 952,
            "iota": 953,
            "kappa": 954,
            "lambda": 955,
            "mu": 956,
            "nu": 957,
            "xi": 958,
            "omicron": 959,
            "pi": 960,
            "rho": 961,
            "sigmaf": 962,
            "sigma": 963,
            "tau": 964,
            "upsilon": 965,
            "phi": 966,
            "chi": 967,
            "psi": 968,
            "omega": 969,
            "thetasym": 977,
            "upsih": 978,
            "piv": 982,
            "ensp": 8194,
            "emsp": 8195,
            "thinsp": 8201,
            "zwnj": 8204,
            "zwj": 8205,
            "lrm": 8206,
            "rlm": 8207,
            "ndash": 8211,
            "mdash": 8212,
            "lsquo": 8216,
            "rsquo": 8217,
            "sbquo": 8218,
            "ldquo": 8220,
            "rdquo": 8221,
            "bdquo": 8222,
            "dagger": 8224,
            "Dagger": 8225,
            "bull": 8226,
            "hellip": 8230,
            "permil": 8240,
            "prime": 8242,
            "Prime": 8243,
            "lsaquo": 8249,
            "rsaquo": 8250,
            "oline": 8254,
            "frasl": 8260,
            "euro": 8364,
            "weierp": 8472,
            "image": 8465,
            "real": 8476,
            "trade": 8482,
            "alefsym": 8501,
            "larr": 8592,
            "uarr": 8593,
            "rarr": 8594,
            "darr": 8595,
            "harr": 8596,
            "crarr": 8629,
            "lArr": 8656,
            "uArr": 8657,
            "rArr": 8658,
            "dArr": 8659,
            "hArr": 8660,
            "forall": 8704,
            "part": 8706,
            "exist": 8707,
            "empty": 8709,
            "nabla": 8711,
            "isin": 8712,
            "notin": 8713,
            "ni": 8715,
            "prod": 8719,
            "sum": 8721,
            "minus": 8722,
            "lowast": 8727,
            "radic": 8730,
            "prop": 8733,
            "infin": 8734,
            "ang": 8736,
            "and": 8743,
            "or": 8744,
            "cap": 8745,
            "cup": 8746,
            "int": 8747,
            "there4": 8756,
            "sim": 8764,
            "cong": 8773,
            "asymp": 8776,
            "ne": 8800,
            "equiv": 8801,
            "le": 8804,
            "ge": 8805,
            "sub": 8834,
            "sup": 8835,
            "nsub": 8836,
            "sube": 8838,
            "supe": 8839,
            "oplus": 8853,
            "otimes": 8855,
            "perp": 8869,
            "sdot": 8901,
            "lceil": 8968,
            "rceil": 8969,
            "lfloor": 8970,
            "rfloor": 8971,
            "lang": 9001,
            "rang": 9002,
            "loz": 9674,
            "spades": 9824,
            "clubs": 9827,
            "hearts": 9829,
            "diams": 9830
        };
        
        var rentity = /&(?:#x([0-9a-fA-F]+)|#([0-9]+)|([0-9A-Za-z]+));/g;
    
        unicode.toHtmlEntities = function( str, fallback ) {
            fallback = checkFallback( fallback );
            var i = 0, 
                codePoint,
                ret = [];

            while( !isNaN( codePoint = unicode.at( str, i++ ) ) ) {

                if( codePoint < 0 ) { //-1 signals low surrogate, that we got a surrogate pair on last iteration.
                    continue;
                }
                else if( codePoint === 0xFFFD || //Don't encode replacement characters, or invalid codepoints
                         codePoint > 0x10FFFF
                ) { 
                    continue;
                }

                //TODO what an ugly mess
                if( codePoint === 34 ) {
                    ret.push( "&quot;");
                }
                else if( codePoint === 38 ) {
                    ret.push( "&amp;" ) ;
                }
                else if( codePoint === 60 ) {
                    ret.push( "&lt;" );
                }
                else if( codePoint === 62 ) {
                    ret.push( "&gt;" );
                }
                else if( ( ( 0x09 <= codePoint && codePoint <= 0x0A ) ||
                        codePoint === 0x0D ||
                     ( 0x20 <= codePoint && codePoint <= 0x7E ) ) &&
                     codePoint !== 39 ) {
                    ret.push( String.fromCharCode(codePoint));
                }
                else {
                    ret.push( "&#" + codePoint + ";" );
                }
            }
            
            return ret.join("");
        };
        
        unicode.fromHtmlEntities = function( str ) {
            return str.replace( rentity, function( match, hex, decimal, named ) {
                var codePoint;
                if( named ) {
                    codePoint = entitiesMap[named];
                    if( !codePoint ) {
                        return match;
                    }
                    return unicode.from( codePoint );
                }
                else if( hex ) {
                    codePoint = parseInt( hex, 16 );
                    return ( 0x00 <= codePoint && codePoint <= 0x10FFFF ) ? unicode.from(codePoint) : match;
                }
                else if( decimal ) {
                    codePoint = parseInt( decimal, 10 );
                    return ( 0x00 <= codePoint && codePoint <= 0x10FFFF ) ? unicode.from(codePoint) : match;
                }
                else {
                    return match;
                }
            });
        };
    
    })();

    (function() {
    

    
        var base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        
        function base64value( code ) {
            if( 65 <= code && code <= 90 ) {
                return code - 65;
            }
            else if( 97 <= code && code <= 122 ) {
                return code - 71;
            }
            else if( 48 <= code && code <= 57 ) {
                return code + 4;
            }
            else if( code === 43 ) {
                return 62;
            }
            else if( code === 47 ) {
                return 63;
            }
            return NaN;
        }
        
        unicode.toBase64 = function( str ) {
            str = checkBinary(str);
            if( str === "" ) {
                return str;
            }
            var ret = [];
            
            var i = 0,
                b1, b2, b3, b4,
                ch1, ch2, ch3,
                len = str.length;
                
            for( i = 0; i < len; i+=3 ) {
                ch1 = str.charCodeAt(i);
                ch2 = str.charCodeAt(i+1);
                ch3 = str.charCodeAt(i+2);
                
                //NaN is converted to 0 in bitwise operations
                b1 = base64.charAt((ch1 & 0xFC) >>> 2);
                b2 = base64.charAt(((ch1 & 0x03) << 4) | ((ch2 & 0xF0) >>> 4));
                b3 = base64.charAt(((ch2 & 0x0F) << 2) | ((ch3 & 0xC0) >>> 6));
                b4 = base64.charAt((ch3 & 0x3F));

                if( isNaN(ch2) ) {
                    b3 = b4 = "=";
                }
                else if( isNaN(ch3) ) {
                    b4 = "=";
                }

                ret.push(b1, b2, b3, b4);                
            }
            
            return ret.join("");
        };
        
        
        unicode.fromBase64 = function( str ) {
            var ret = [];
            if( str === "" ) {
                return str;
            }
            var i = 0,
                b1, b2, b3, b4,
                ch1, ch2, ch3,
                len = str.length;
                
            for( i = 0; i < len; i+=4 ) {
                b1 = base64value(str.charCodeAt(i));
                b2 = base64value(str.charCodeAt(i+1));
                b3 = base64value(str.charCodeAt(i+2));
                b4 = base64value(str.charCodeAt(i+3));
                
                if( isNaN(b1) < 0 || isNaN(b2) < 0  ) {
                    throw new DecoderError( "Invalid base64");
                }
                
                //b3 or b4 cannot be invalid if we are going to the next iteration
                if( (isNaN(b3) || isNaN(b4)) && ( i+4 < len ) ) {
                    throw new DecoderError( "Invalid base64");
                }

                ch1 = ((b1 & 0x3f) << 2) | ((b2 & 0x30) >>> 4);
                ch2 = ((b2 & 0x0F) << 4 ) | ((b3 & 0x3C) >>> 2);
                ch3 = ((b3 & 0x03) << 6 ) | ((b4 & 0x3F) >>> 0);

                if( isNaN(b3) ) {
                    ret.push( String.fromCharCode(ch1));
                }
                else if( isNaN(b4) ) {
                    ret.push( String.fromCharCode(ch1, ch2));
                }
                else {
                    ret.push( String.fromCharCode(ch1, ch2, ch3));                
                }
            }
            
            return ret.join("");
        };
    
    })();
    
    //under construction
    function detectEncoding( str ) {
        str = checkBinary(str);
        var possibleBom = str.substr(0, Math.min(str.length, 4));
        if( possibleBom === UTF8BOM ) {
            return "UTF-8";
        }
        else if( possibleBom === UTF16LEBOM || possibleBom === UTF16BEBOM ) {
            return "UTF-16";
        }
        else if( possibleBom === UTF32LEBOM || possibleBom === UTF32BEBOM ) {
            return "UTF-32";
        }
    }


    if( typeof module !== "undefined" && module.exports ) {
        module.exports = unicode;
    }
    else if ( global ) {
        global.unicode = unicode;
    }


        
})(this, this.String);