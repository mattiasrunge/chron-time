define(["module", "moment-timezone"], function (module, moment) {
    "use strict";

    /* Definitions:
     * - str : Time specified in string format
     * - time : Time specified in object format
     * - timestamp : Best timestamp from list of sources (time objects)
     * - sources : Object with one or more of the gps, device and manual keys with time objects
     */

    var splitAt = function (str, index) {
        return [str.slice(0, index), str.slice(index)];
    };

    var isNumber = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };

    var assert = function (bool, message) {
        if (!bool) {
            throw new Error(message);
        }
    };

    var validate = function (input, type) {
        var data = input;
        var max = {
            year: 9999,
            month: 12,
            day: 31,
            hour: 23,
            minute: 59,
            second: 59,
            timezone: 59
        };
        var min = {
            year: "0000",
            month: "01",
            day: "00",
            hour: "00",
            minute: "00",
            second: "00",
            timezone: "00"
        };

        if (type === "timezone") {
            assert(data.length === 6, type + " must be 6 letters and digits");
            var hours = data.substr(1, 2);
            var separator = data.substr(3, 1);
            var minutes = data.substr(4, 2);

            assert(hours.length === 2, type + " must be 2 digits");
            assert(isNumber(hours), type + " hours must be a number");
            assert(separator === ":", type + " separator must be a :");
            assert(isNumber(minutes), type + " minutes must be a number");
            assert(parseInt(hours, 10) >= parseInt(min[type], 10), type + " hours must be larger or equal to " + min[type]);
            assert(parseInt(minutes, 10) <= max[type], type + " minutes must be smallar or equal to " + max[type]);

            return data;
        }

        if (typeof input === "string") {
            data = [input];
        }

        var len = type === "year" ? 4 : 2;

        assert(data[0].length === len, type + " must be " + len + " digits");
        assert(isNumber(data[0]), type + " must be a number");
        assert(parseInt(data[0], 10) >= parseInt(min[type], 10), type + " must be larger or equal to " + min[type]);
        assert(parseInt(data[0], 10) <= max[type], type + " must be smallar or equal to " + max[type]);

        if (data.length > 1) {
            assert(data[1].length === len, type + " must be " + len + " digits");
            assert(isNumber(data[1]), type + " must be a number");
            assert(parseInt(data[0], 10) < parseInt(data[1], 10), type + " range can not be negative");
            assert(parseInt(data[1], 10) >= parseInt(min[type], 10), type + " must be larger or equal to " + min[type]);
            assert(parseInt(data[1], 10) <= max[type], type + " must be smallar or equal to " + max[type]);
        }

        return input;
    };

    var parsetime = function (time, timeIsDstAdjusted) {
        var timestamp = false;
        var quality = false;

        if (time) {
            var utcOffset = 0;
            var dstOffset = 0;
            var foundRange = false;
            var spec = {};
            quality = "fuzzy";

            if (time.year) {
                foundRange = time.year instanceof Array;
                spec.year = parseInt(foundRange ? time.year[0] : time.year, 10);
            }

            if (time.month && !foundRange) {
                foundRange = time.month instanceof Array;
                spec.month = parseInt(foundRange ? time.month[0] : time.month, 10) - 1; // Moment expects zero based
            }

            if (time.day && !foundRange) {
                foundRange = time.day instanceof Array;
                spec.day = parseInt(foundRange ? time.day[0] : time.day, 10);
            }

            if (time.hour && !foundRange) {
                foundRange = time.hour instanceof Array;
                spec.hour = parseInt(foundRange ? time.hour[0] : time.hour, 10);
            }

            if (time.minute && !foundRange) {
                foundRange = time.minute instanceof Array;
                spec.minute = parseInt(foundRange ? time.minute[0] : time.minute, 10);
            }

            if (time.second && !foundRange) {
                foundRange = time.second instanceof Array;
                spec.second = parseInt(foundRange ? time.second[0] : time.second, 10);

                if (!foundRange) {
                    quality = "local";

                    if (timeIsDstAdjusted) {
                        dstOffset = moment(spec).isDST() ? 3600 : 0;
                    }
                }
            }

            if (time.timezone && !foundRange) {
                utcOffset = moment(spec).utcOffset(time.timezone).utcOffset() * 60;
                quality = "utc";
            }

            timestamp = moment.utc(spec).unix() - utcOffset - dstOffset;
        }

        return {
            timestamp: timestamp,
            quality: quality
        };
    };

    module.exports = {
        str2time: function (str) {
            var result = {};
            var foundRange = false;

            if (str.length < 4) {
                return false;
            }

            // Year
            var parts = splitAt(str, 4);
            result.year = validate(parts[0], "year");
            str = parts[1];

            if (str[0] === "|") {
                var _parts = splitAt(str.slice(1), 4);
                result.year = validate([result.year, _parts[0]], "year");
                str = _parts[1];
                foundRange = true;
            }

            if (str.length > 0 && !foundRange) {
                // Month
                if (str[0] === "-") {
                    var _parts2 = splitAt(str.slice(1), 2);
                    result.month = validate(_parts2[0], "month");
                    str = _parts2[1];
                } else {
                    throw new Error("Expected a -");
                }

                if (str[0] === "|") {
                    var _parts3 = splitAt(str.slice(1), 2);
                    result.month = validate([result.month, _parts3[0]], "month");
                    str = _parts3[1];
                    foundRange = true;
                }
            }

            if (str.length > 0 && !foundRange) {
                // Day
                if (str[0] === "-") {
                    var _parts4 = splitAt(str.slice(1), 2);
                    result.day = validate(_parts4[0], "day");
                    str = _parts4[1];
                } else {
                    throw new Error("Expected a -");
                }

                if (str[0] === "|") {
                    var _parts5 = splitAt(str.slice(1), 2);
                    result.day = validate([result.day, _parts5[0]], "day");
                    str = _parts5[1];
                    foundRange = true;
                }
            }

            if (str.length > 0 && !foundRange) {
                // Hour
                if (str[0] === " " || str[0] === "T") {
                    var _parts6 = splitAt(str.slice(1), 2);
                    result.hour = validate(_parts6[0], "hour");
                    str = _parts6[1];
                } else {
                    throw new Error("Expected a space or T");
                }

                if (str[0] === "|") {
                    var _parts7 = splitAt(str.slice(1), 2);
                    result.hour = validate([result.hour, _parts7[0]], "hour");
                    str = _parts7[1];
                    foundRange = true;
                }
            }

            if (str.length > 0 && !foundRange) {
                // Minute
                if (str[0] === ":") {
                    var _parts8 = splitAt(str.slice(1), 2);
                    result.minute = validate(_parts8[0], "minute");
                    str = _parts8[1];
                } else {
                    throw new Error("Expected a :");
                }

                if (str[0] === "|") {
                    var _parts9 = splitAt(str.slice(1), 2);
                    result.minute = validate([result.minute, _parts9[0]], "minute");
                    str = _parts9[1];
                    foundRange = true;
                }
            }

            if (str.length > 0 && !foundRange) {
                // Second
                if (str[0] === ":") {
                    var _parts10 = splitAt(str.slice(1), 2);
                    result.second = validate(_parts10[0], "second");
                    str = _parts10[1];
                } else {
                    throw new Error("Expected a :");
                }

                if (str[0] === "|") {
                    var _parts11 = splitAt(str.slice(1), 2);
                    result.second = validate([result.second, _parts11[0]], "second");
                    str = _parts11[1];
                    foundRange = true;
                }
            }

            if (str.length > 0 && !foundRange) {
                // Second
                if (str[0] === "Z") {
                    result.timezone = "+00:00";
                    str = str.slice(1);
                } else if (str[0] === "-" || str[0] === "+") {
                    var _parts12 = splitAt(str, 6);
                    result.timezone = validate(_parts12[0], "timezone");
                    str = _parts12[1];
                } else {
                    throw new Error("Expected a - or +");
                }
            }

            if (str.length > 0 && foundRange) {
                throw new Error("Can not add more information after range");
            } else if (str.length > 0 && result.timezone) {
                throw new Error("Can not add more information after timezone");
            }

            return result;
        },
        time2str: function (time) {
            var str = "";

            if (time.year instanceof Array) {
                str += time.year[0] + "|" + time.year[1];
                return str;
            } else if (time.year) {
                str += time.year;
            } else {
                return str;
            }

            if (time.month instanceof Array) {
                str += "-" + time.month[0] + "|" + time.month[1];
                return str;
            } else if (time.month) {
                str += "-" + time.month;
            } else {
                return str;
            }

            if (time.day instanceof Array) {
                str += "-" + time.day[0] + "|" + time.day[1];
                return str;
            } else if (time.day) {
                str += "-" + time.day;
            } else {
                return str;
            }

            if (time.hour instanceof Array) {
                str += " " + time.hour[0] + "|" + time.hour[1];
                return str;
            } else if (time.hour) {
                str += " " + time.hour;
            } else {
                return str;
            }

            if (time.minute instanceof Array) {
                str += ":" + time.minute[0] + "|" + time.minute[1];
                return str;
            } else if (time.minute) {
                str += ":" + time.minute;
            } else {
                return str;
            }

            if (time.second instanceof Array) {
                str += ":" + time.second[0] + "|" + time.second[1];
                return str;
            } else if (time.second) {
                str += ":" + time.second;
            } else {
                return str;
            }

            if (time.timezone) {
                str += time.timezone;
            }

            return str;
        },
        time2timestamp: function (time, params) {
            var timeIsDstAdjusted = false;

            if (params.type === "manual") {
                timeIsDstAdjusted = true;
            } else if (params.type === "gps") {
                timeIsDstAdjusted = false;
            } else if (params.type === "device") {
                timeIsDstAdjusted = params.deviceAutoDst;
            } else {
                throw new Error("Unknown type " + params.type);
            }

            var timestamp = parsetime(time, timeIsDstAdjusted);

            if (timestamp.quality !== false && params.type === "device") {
                if (params.deviceUtcOffset) {
                    timestamp.timestamp -= params.deviceUtcOffset;
                    timestamp.quality = "utc";
                }
            }

            timestamp.type = params.type;

            return timestamp;
        },
        select: function (sources) {
            if (sources.manual) {
                return { time: sources.manual, type: "manual" };
            } else if (sources.gps) {
                return { time: sources.gps, type: "gps" };
            } else if (sources.device) {
                return { time: sources.device, type: "device" };
            }

            return false;
        }
    };
});
