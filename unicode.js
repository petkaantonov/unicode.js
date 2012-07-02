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
;(function(global, String) {
"use strict";

    var unicode = {};

    unicode.from = function( fromCharCode ) {
 
        return function() {
            var i,
                len = arguments.length,
                num,
                args = [];

            for( i = 0; i < len; ++i ) {
                num = +arguments[i];

                if( !isFinite( num ) ) {
                    continue;
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
    
    unicode.at = function( charCodeAt ) {
        return function( str, num ) {
            var idx = +num,
                code,
                low,
                high;
                
            high = code = charCodeAt.call( str, idx );


            if( idx >= str.length ) {
                return NaN;
            }

            if( !isFinite( code ) ) {
                return 0xFFFD;
            }
            else if( 0xD800 <= code && code <= 0xDBFF ) {
                low = charCodeAt.call( str, idx+1 );

                if( !isFinite( low ) ) {
                    return 0xFFFD;
                }
                return ((high - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000; 
            }
            else if( 0xDC00 <= code && code <= 0xDFFF ) {
                return -1;
            }

            return code;
        };
     }( String.prototype.charCodeAt );

    unicode.toUTF8 = function( str ) {

        var i = 0, 
            codePoint,
            ret = [];

        while( !isNaN( codePoint = unicode.at( str, i++) ) ) {

            if( codePoint < 0 ) {
                continue;
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
            else if( codePoint <= 0x1FFFFF ) {
                ret.push( String.fromCharCode(
                    0xF0 | ( ( codePoint & 0x1C0000 ) >>> 18 ),
                    0x80 | ( ( codePoint & 0x3F000 ) >>> 12 ),
                    0x80 | ( ( codePoint & 0xFC0 ) >>> 6 ),
                    0x80 | ( codePoint & 0x3F  )
                ));             
            }
            else {
                ret.push( String.fromCharCode( 0xFFFD ) );
            }
        }

        return ret.join("");
    };

    unicode.fromUTF8 = function( str ) {
        //Decode unicode code points from utf8 encoded string
        var codePoints = [],
            i = 0, byte;

        while( !isNaN( byte = str.charCodeAt(i++) ) ) {
            if( (byte & 0xF8) === 0xF0 ) {
                codePoints.push(
                    ((byte & 0x7) << 18) |
                    ((str.charCodeAt(i++) & 0x3F) << 12) |
                    ((str.charCodeAt(i++) & 0x3F) << 6) |
                    (str.charCodeAt(i++) & 0x3F)
                );
            }
            else if( (byte & 0xF0) === 0xE0 ) {
                codePoints.push(
                    ((byte & 0xF) << 12) |
                    ((str.charCodeAt(i++) & 0x3F) << 6 ) |
                    (str.charCodeAt(i++) & 0x3F)
                );
            }
            else if( (byte & 0xE0) === 0xC0 ) {
                codePoints.push(
                    ((byte & 0x1F) << 6) |
                    ( (str.charCodeAt(i++) & 0x3F) )
                );
            }
            else if( (byte & 0x80) === 0x00 ) {
                codePoints.push( byte & 0x7F );
            }
            else {
                codePoints.push( 0xFFFD );
            }

        }    
        return unicode.from.apply( String, codePoints );
    };


    unicode.toUTF32 = function( str ) {
        var i = 0, 
            codePoint,
            ret = [];

        while( !isNaN( codePoint = unicode.at( str,i++) ) ) {

            if( codePoint < 0 ) {
                continue;
            }
            else {
                ret.push( String.fromCharCode(
                    (codePoint & 0xFF000000) >>> 24,
                    (codePoint & 0xFF0000) >>> 16,
                    (codePoint & 0xFF00) >>> 8,
                    (codePoint & 0xFF)
                ));
            }
        }

        return ret.join("");
    };

    unicode.toLatin1 = function( str ) {
        var i = 0, 
            codePoint,
            ret = [];

        while( !isNaN( codePoint = unicode.at( str,i++) ) ) {

            if( 
                ( codePoint < 0x20 ) ||
                ( 0x7E < codePoint && codePoint < 0xA0 ) ||
                ( codePoint > 0xFF )
            ) {
                throw new TypeError( "Cannot encode character in Latin-1" );
            }
            else {
                ret.push( String.fromCharCode( codePoint & 0xFF ) );
            }
        }

        return ret.join("");

    };

    unicode.toISO88591 = unicode.toLatin1;

    unicode.fromLatin1 = function( str ) {
        //Decode unicode code points from ISO-8859-1 encoded string
        var codePoints = [],
            i = 0, byte, len = str.length;

        for( i = 0; i < len; i ++ ) {
            var byte = str.charCodeAt(i) & 0xFF;

            if( ( byte < 0x20 ) ||
                ( 0x7E < byte && byte < 0xA0 )
            ) {
                codePoints.push( 0xFFFD );
            }
            else {
                codePoints.push( byte );
            }
        }

        return unicode.from.apply( String, codePoints );
    };

    unicode.fromISO88591 = unicode.fromLatin1;

    (function() {

        var map = [
                0x00,   0x01,   0x02,   0x03,   0x04,   0x05,   0x06,   0x07,   0x08,   0x09,   0x0A,   0x0B,   0x0C,   0x0D,   0x0E,   0x0F,
                0x10,   0x11,   0x12,   0x13,   0x14,   0x15,   0x16,   0x17,   0x18,   0x19,   0x1A,   0x1B,   0x1C,   0x1D,   0x1E,   0x1F,
                0x20,   0x21,   0x22,   0x23,   0x24,   0x25,   0x26,   0x27,   0x28,   0x29,   0x2A,   0x2B,   0x2C,   0x2D,   0x2E,   0x2F,
                0x30,   0x31,   0x32,   0x33,   0x34,   0x35,   0x36,   0x37,   0x38,   0x39,   0x3A,   0x3B,   0x3C,   0x3D,   0x3E,   0x3F,
                0x40,   0x41,   0x42,   0x43,   0x44,   0x45,   0x46,   0x47,   0x48,   0x49,   0x4A,   0x4B,   0x4C,   0x4D,   0x4E,   0x4F,
                0x50,   0x51,   0x52,   0x53,   0x54,   0x55,   0x56,   0x57,   0x58,   0x59,   0x5A,   0x5B,   0x5C,   0x5D,   0x5E,   0x5F,
                0x60,   0x61,   0x62,   0x63,   0x64,   0x65,   0x66,   0x67,   0x68,   0x69,   0x6A,   0x6B,   0x6C,   0x6D,   0x6E,   0x6F,
                0x70,   0x71,   0x72,   0x73,   0x74,   0x75,   0x76,   0x77,   0x78,   0x79,   0x7A,   0x7B,   0x7C,   0x7D,   0x7E,   0x7F,
                0x20AC, 0xFFFD, 0x201A, 0x192,  0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x160,  0x2039, 0x152,  0xFFFD, 0x017D, 0xFFFD,
                0xFFFD, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014, 0x02DC, 0x2122, 0x161,  0x203A, 0x153,  0xFFFD, 0x017E, 0x178,
                0x160,  0xA1,   0xA2,   0xA3,   0xA4,   0xA5,   0xA6,   0xA7,   0xA8,   0xA9,   0xAA,   0xAB,   0xAC,   0xAD,   0xAE,   0xAF,
                0xB0,   0xB1,   0xB2,   0xB3,   0xB4,   0xB5,   0xB6,   0xB7,   0xB8,   0xB9,   0xBA,   0xBB,   0xBC,   0xBD,   0xBE,   0xBF,
                0xC0,   0xC1,   0xC2,   0xC3,   0xC4,   0xC5,   0xC6,   0xC7,   0xC8,   0xC9,   0xCA,   0xCB,   0xCC,   0xCD,   0xCE,   0xCF,
                0xD0,   0xD1,   0xD2,   0xD3,   0xD4,   0xD5,   0xD6,   0xD7,   0xD8,   0xD9,   0xDA,   0xDB,   0xDC,   0xDD,   0xDE,   0xDF,
                0xE0,   0xE1,   0xE2,   0xE3,   0xE4,   0xE5,   0xE6,   0xE7,   0xE8,   0xE9,   0xEA,   0xEB,   0xEC,   0xED,   0xEE,   0xEF,
                0xF0,   0xF1,   0xF2,   0xF3,   0xF4,   0xF5,   0xF6,   0xF7,   0xF8,   0xF9,   0xFA,   0xFB,   0xFC,   0xFD,   0xFE,   0xFF
            ],

            unicodeMap = {};

        var l = 256;

        while( l-- ) {
            unicodeMap[map[l]] = l;
        }

        unicode.toWindows1252 = function(str) {
            var i = 0, 
                codePoint,
                code,
                ret = [];

            while( !isNaN( codePoint = unicode.at( str, i++) ) ) {

                code = +unicodeMap[codePoint];

                if( isNaN( code ) || codePoint === 0xFFFD ) {
                    throw new TypeError( "Cannot encode character in Windows-1252" );
                }
                ret.push( String.fromCharCode( code ) );
            }

            return ret.join("");
        };

        unicode.fromWindows1252 = function( str ) {
            //Decode unicode code points from Windows-1252 encoded string
            var codePoints = [],
                i = 0, byte, len = str.length;

            for( i = 0; i < len; i ++ ) {
                var byte = str.charCodeAt(i) & 0xFF;
                codePoints.push( map[byte] );
            }

            return unicode.from.apply( String, codePoints );
        };

    })();

    unicode.fromUTF32 = function( str ) {
        //Decode unicode code points from utf32 encoded string
        var codePoints = [],
            i = 0, byte, len = str.length;

        if( len % 4 !== 0 ) {
            throw new TypeError( "invalid utf32" );  
        }

        for( i = 0; i < len; i += 4 ) {
            codePoints.push(
                ((str.charCodeAt(i) & 0xFF)   << 24 )  |
                ((str.charCodeAt(i+1) & 0xFF)  << 16 )  |
                ((str.charCodeAt(i+2) & 0xFF) << 8  )  |
                (str.charCodeAt(i+3) & 0xFF)
            );
        }

        return unicode.from.apply( String, codePoints );
    };

    (function(){

        var ByteArray = global.Uint8Array || global.Array,
            toArray = [].slice;

        unicode.toByteArray = function (str) {

            var tmp = [],
                i = 0, 
                bytes,
                len,
                byteArr;

            while( !isNaN( bytes = str.charCodeAt(i++) ) ) {

                if( bytes > 0xFF ) {
                    tmp.push(
                        ((bytes & 0xFF00) >>> 8),
                        bytes & 0xFF
                    );
                }
                else {
                    tmp.push( bytes & 0xFF );
                }
            }
            len = tmp.length;
            byteArr = new ByteArray(len);

            for( i = 0; i < len; ++i ) {
                byteArr[i] = tmp[i];
            }

            return byteArr;
        };

        unicode.fromByteArray = function( arr ) {
           arr = toArray.call( arr );
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

        unicode.uriEncode = function(str) {
            var ret = [],
                i = 0,
                code,
                len = str.length;
                
            str = unicode.toUTF8(str);
            
            while( !isNaN( code = str.charCodeAt(i++) ) ) {
                if(
                    67 <= code && code <= 90 ||
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

        unicode.uriDecode = function(str) {
            return unicode.fromUTF8(str.replace(rpercent, replacer));
        };

    })();
    
    (function(){
    
        var map = [
            0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
            0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD, 0xFFFD,
            0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x002A, 0x002B, 0x002C, 0x002D, 0x002E, 0x002F,
            0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F,
            0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x004A, 0x004B, 0x004C, 0x004D, 0x004E, 0x004F,
            0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x005A, 0x005B, 0x005C, 0x005D, 0x005E, 0x005F,
            0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x006A, 0x006B, 0x006C, 0x006D, 0x006E, 0x006F,
            0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x007A, 0x007B, 0x007C, 0x007D, 0x007E, 0xFFFD,
            0x2500, 0x2502, 0x250C, 0x2510, 0x2514, 0x2518, 0x251C, 0x2524, 0x252C, 0x2534, 0x253C, 0x2580, 0x2584, 0x2588, 0x258C, 0x2590,
            0x2591, 0x2592, 0x2593, 0x2320, 0x25A0, 0x2219, 0x221A, 0x2248, 0x2264, 0x2265, 0x00A0, 0x2321, 0x00B0, 0x00B2, 0x00B7, 0x00F7,
            0x2550, 0x2551, 0x2552, 0x451, 0x2553, 0x2554, 0x2555, 0x2556, 0x2557, 0x2558, 0x2559, 0x255A, 0x255B, 0x255C, 0x255D, 0x255E,
            0x255F, 0x2560, 0x2561, 0x401, 0x2562, 0x2563, 0x2564, 0x2565, 0x2566, 0x2567, 0x2568, 0x2569, 0x256A, 0x256B, 0x256C, 0x00A9,
            0x044E, 0x430, 0x431, 0x446, 0x434, 0x435, 0x444, 0x433, 0x445, 0x438, 0x439, 0x043A, 0x043B, 0x043C, 0x043D, 0x043E,
            0x043F, 0x044F, 0x440, 0x441, 0x442, 0x443, 0x436, 0x432, 0x044C, 0x044B, 0x437, 0x448, 0x044D, 0x449, 0x447, 0x044A,
            0x042E, 0x410, 0x411, 0x426, 0x414, 0x415, 0x424, 0x413, 0x425, 0x418, 0x419, 0x041A, 0x041B, 0x041C, 0x041D, 0x041E,
            0x041F, 0x042F, 0x420, 0x421, 0x422, 0x423, 0x416, 0x412, 0x042C, 0x042B, 0x417, 0x428, 0x042D, 0x429, 0x427, 0x042A
        ];
        
        
        var unicodeMap = {};

        var l = 256;

        while( l-- ) {
            unicodeMap[map[l]] = l;
        }
    
        unicode.toKOI8R = function( str ) {
        
            var i = 0, 
                codePoint,
                code,
                ret = [];

            while( !isNaN( codePoint = unicode.at( str, i++) ) ) {

                code = +unicodeMap[codePoint];

                if( isNaN( code ) || codePoint === 0xFFFD ) {
                    throw new TypeError( "Cannot encode character in KOI8-R" );
                }
                ret.push( String.fromCharCode( code ) );
            }

            return ret.join(""); 
        };
        
        unicode.fromKOI8R = function( str ) {
            //Decode unicode code points from KOI8-R encoded string
            var codePoints = [],
                i = 0, byte, len = str.length;

            for( i = 0; i < len; i ++ ) {
                var byte = str.charCodeAt(i) & 0xFF;
                codePoints.push( map[byte] );
            }

            return unicode.from.apply( String, codePoints );
        };
    })();

    if( typeof module !== "undefined" && module.exports ) {
        module.exports = unicode;
    }
    else if ( global ) {
        global.unicode = unicode;
    }
        
})(this, this.String);