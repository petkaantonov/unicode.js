String.fromUnicode = function( fromCharCode ) {
 
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
                args.push( 0xFFFE );
            }
        }
        
        return fromCharCode.apply( String, args );
    };
 
}(String.fromCharCode);
 
 String.prototype.toUnicodePoints = function() {
    var len = this.length,
        i,
        ret = [],
        cur;
        
        for( i = 0; i < len; ++i ) {
            cur = this.unicodeAt(i);
            if( cur === -1 ) {
                continue;
            }
            
            if( !isFinite( cur ) ) {
                break;    
            }
            
            ret.push( cur );
        }
        
        return ret;
 };
 
 String.prototype.unicodeAt = function( charCodeAt ) {
 
    return function( num ) {
        var str = this,
            idx = +num,
            high = code = charCodeAt.call( str, idx ),
            low;
            
        if( idx >= this.length ) {
            return NaN;
        }
            
        if( !isFinite( code ) ) {
            return 0xFFFE;
        }
        else if( 0xD800 <= code && code <= 0xDBFF ) {
            low = charCodeAt.call( str, idx+1 );
            
            if( !isFinite( low ) ) {
                return 0xFFFE;
            }
            return ((high - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000; 
        }
        else if( 0xDC00 <= code && code <= 0xDFFF ) {
            return -1;
        }
        
        return code;
    };
 }( String.prototype.charCodeAt );

String.prototype.toUTF8 = function() {

    var i = 0, 
        codePoint,
        ret = [];
        
    while( !isNaN( codePoint = this.unicodeAt(i++) ) ) {
    
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
            ret.push( String.fromCharCode( 0xFFFE ) );
        }
    }
    
    return ret.join("");
};

String.fromUTF8 = function( str ) {
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
            codePoints.push( 0xFFFE );
        }
    
    }    
    return String.fromUnicode.apply( String, codePoints );
};

String.prototype.toUTF32 = function() {
    var i = 0, 
        codePoint,
        ret = [];
        
    while( !isNaN( codePoint = this.unicodeAt(i++) ) ) {
    
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

String.prototype.toLatin1 = function() {
    var i = 0, 
        codePoint,
        ret = [];
        
    while( !isNaN( codePoint = this.unicodeAt(i++) ) ) {
    
        if( codePoint < 0 ) {
            throw new TypeError( "Cannot encode character in Latin-1" );
        }
        else if( ( codePoint < 0x20 ) ||
            ( 0x7E < codePoint && codePoint < 0xA0 ) ||
            ( codePoint > 0xFF )
        ) {
            throw new TypeError( "Cannot encode character in Latin-1" );
        }
        else {
            ret.push( String.fromCharCode( codePoint & 0xFF ));
        }
    }
    
    return ret.join("");

};

String.fromLatin1 = function( str ) {
    //Decode unicode code points from ISO-8859-1 encoded string
    var codePoints = [],
        i = 0, byte, len = str.length;
            
    for( i = 0; i < len; i ++ ) {
        var byte = str.charCodeAt(i) & 0xFF;
        
        if( ( byte < 0x20 ) ||
            ( 0x7E < byte && byte < 0xA0 )
        ) {
            throw new TypeError( "invalid Latin-1" );
        }
        else {
            codePoints.push( byte );
        }
    }
    
    return String.fromUnicode.apply( String, codePoints );
};




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
            0x20AC, 0xFFFE, 0x201A, 0x192,  0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x160,  0x2039, 0x152,  0xFFFE, 0x017D, 0xFFFE,
            0xFFFE, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014, 0x02DC, 0x2122, 0x161,  0x203A, 0x153,  0xFFFE, 0x017E, 0x178,
            0x160,  0xA1,   0xA2,   0xA3,   0xA4,   0xA5,   0xA6,   0xA7,   0xA8,   0xA9,   0xAA,   0xAB,   0xAC,   0xAD,   0xAE,   0xAF,
            0xB0,   0xB1,   0xB2,   0xB3,   0xB4,   0xB5,   0xB6,   0xB7,   0xB8,   0xB9,   0xBA,   0xBB,   0xBC,   0xBD,   0xBE,   0xBF,
            0xC0,   0xC1,   0xC2,   0xC3,   0xC4,   0xC5,   0xC6,   0xC7,   0xC8,   0xC9,   0xCA,   0xCB,   0xCC,   0xCD,   0xCE,   0xCF,
            0xD0,   0xD1,   0xD2,   0xD3,   0xD4,   0xD5,   0xD6,   0xD7,   0xD8,   0xD9,   0xDA,   0xDB,   0xDC,   0xDD,   0xDE,   0xDF,
            0xE0,   0xE1,   0xE2,   0xE3,   0xE4,   0xE5,   0xE6,   0xE7,   0xE8,   0xE9,   0xEA,   0xEB,   0xEC,   0xED,   0xEE,   0xEF,
            0xF0,   0xF1,   0xF2,   0xF3,   0xF4,   0xF5,   0xF6,   0xF7,   0xF8,   0xF9,   0xFA,   0xFB,   0xFC,   0xFD,   0xFE,   0xFF
        ],
        
        unicodeToWindowsMap = {};
        
    var l = 256;
    
    while( l-- ) {
        unicodeToWindowsMap[ map[l] ] = l;
    }

    String.prototype.toWindows1252 = function() {
        var i = 0, 
            codePoint,
            code,
            ret = [];

        while( !isNaN( codePoint = this.unicodeAt(i++) ) ) {

            code = +unicodeToWindowsMap[codePoint];
            
            if( isNaN( code ) ) {
                throw new TypeError( "Cannot encode character in Windows-1252" );
            }
            ret.push( String.fromCharCode( code ));
        }

        return ret.join("");
    };

    String.fromWindows1252 = function( str ) {
        //Decode unicode code points from Windows-1252 encoded string
        var codePoints = [],
            i = 0, byte, len = str.length;

        for( i = 0; i < len; i ++ ) {
            var byte = str.charCodeAt(i) & 0xFF;
            codePoints.push( map[byte] );
        }

        return String.fromUnicode.apply( String, codePoints );
    };

})();

String.fromUTF32 = function( str ) {
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
    
    return String.fromUnicode.apply( String, codePoints );
};