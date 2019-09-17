"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var types_1 = require("./types");
function loggerMiddleware(request, response, next) {
    console.log(request.method + " " + request.path + " " + request.body);
    next();
}
var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;
var app = express_1.default();
app.use(express_1.default.json({ limit: '50mb' }));
app.use(loggerMiddleware);
app.post('/extract', function (request, response) {
    var rawData = request.body;
    var words = [];
    for (var _i = 0, _a = rawData.pages; _i < _a.length; _i++) {
        var p = _a[_i];
        for (var _b = 0, _c = p.elements; _b < _c.length; _b++) {
            var e = _c[_b];
            for (var _d = 0, _e = e.content; _d < _e.length; _d++) {
                var c = _e[_d];
                for (var _f = 0, _g = c.content; _f < _g.length; _f++) {
                    var t = _g[_f];
                    words.push(t);
                }
            }
        }
    }
    var compareById = function (a, b) {
        return a.id - b.id;
    };
    words.sort(compareById);
    for (var _h = 0, words_1 = words; _h < words_1.length; _h++) {
        var w = words_1[_h];
        console.log(w.id + ': ' + w.content + ' \t\tconfidence ' + w.conf);
    }
    var firstEntry = findFirstLine(words);
    var table = words.filter(function (word) { return word.id >= firstEntry; });
    var result = [];
    for (var i = 0; i < table.length; i++) {
        var entry = new types_1.YearEntry;
        var year = table[i++];
        entry.year = parseInt(year.content);
        if (isNaN(entry.year)) {
            console.log('not a number: ' + year.content);
            break;
        }
        var income = table[i++];
        entry.income = parseInt(income.content.replace('\'', ''));
        if (isNaN(entry.income)) {
            console.log('not a number: ' + income.content);
            break;
        }
        entry.confidence = Math.min(year.conf, income.conf);
        result.push(entry);
    }
    console.log('extract end' + new Date());
    response.send(result);
});
app.post('/vision', function (request, response) {
    var rawData = request.body;
    var words = [];
    for (var _i = 0, _a = rawData.regions; _i < _a.length; _i++) {
        var r = _a[_i];
        for (var _b = 0, _c = r.lines; _b < _c.length; _b++) {
            var l = _c[_b];
            for (var _d = 0, _e = l.words; _d < _e.length; _d++) {
                var w = _e[_d];
                words.push(w);
            }
        }
    }
    var firstEntry = findDatori(words);
    if (!firstEntry) {
        console.log('no reference entry found (datori)');
        return;
    }
    console.log('datori sono ab y ' + JSON.stringify(firstEntry));
    var tolerance = getHeight(firstEntry);
    var verticalOffset = getY(firstEntry) + tolerance;
    var table = words.filter(function (word) { return getY(word) >= verticalOffset; });
    var compareByCoordinate = function (a, b) {
        if (Math.abs(getY(a) - getY(b)) < tolerance / 2) {
            return getX(a) - getX(b);
        }
        return getY(a) - getY(b);
    };
    table.sort(compareByCoordinate);
    console.log('sorted table ' + JSON.stringify(table));
    var result = [];
    var entry = [];
    var x = 0;
    for (var _f = 0, table_1 = table; _f < table_1.length; _f++) {
        var w = table_1[_f];
        if (getX(w) < x) {
            // zeile ist fertig, wir verarbeiten jetzt die vorhandene
            if (entry.length > 3) {
                var res_1 = processLine(entry, tolerance);
                if (!res_1) {
                    break;
                }
                result.push(res_1);
            }
            entry = [];
            x = 0;
        }
        else {
            entry.push(w);
            x = getX(w);
        }
    }
    var res = processLine(entry, tolerance);
    if (res) {
        result.push(res);
    }
    var aggregated = [];
    var prev;
    for (var _g = 0, result_1 = result; _g < result_1.length; _g++) {
        var r = result_1[_g];
        if (prev) {
            if (prev.year == r.year) {
                prev.income += r.income;
            }
            else {
                aggregated.push(r);
                prev = r;
            }
        }
        else {
            aggregated.push(r);
            prev = r;
        }
    }
    console.log('vision: ' + JSON.stringify(aggregated));
    console.log('vision end' + new Date());
    response.send(aggregated);
});
function processLine(words, tolerance) {
    var terms = [];
    if (!words[0]) {
        return;
    }
    var term = words[0].text;
    var prev = words[0];
    for (var i = 1; i < words.length; i++) {
        if ((getX(words[i]) - (getX(prev) + getWidth(prev)) > tolerance)) {
            terms.push(term);
            term = words[i].text;
            prev = words[i];
        }
        else {
            term = term + words[i].text;
            prev = words[i];
        }
    }
    terms.push(term);
    console.log('line: ' + JSON.stringify(terms));
    var entry = new types_1.YearEntry;
    entry.year = parseInt(terms[terms.length - 3]);
    if (isNaN(entry.year)) {
        console.log('not a number: ' + terms[terms.length - 3]);
        return;
    }
    var currentYear = new Date().getFullYear().toString().substring(2, 4);
    if (entry.year > parseInt(currentYear)) {
        entry.year = entry.year + 1900;
    }
    else {
        entry.year = entry.year + 2000;
    }
    var income = terms[terms.length - 2];
    entry.income = parseInt(income.replace('\'', ''));
    if (isNaN(entry.income)) {
        console.log('not a number: ' + terms[terms.length - 2]);
        return;
    }
    entry.confidence = -1;
    return entry;
}
function findDatori(word) {
    for (var _i = 0, word_1 = word; _i < word_1.length; _i++) {
        var w = word_1[_i];
        if (w.text.startsWith('Datori') || w.text.startsWith('reddito')) {
            return w;
        }
    }
}
function getX(word) {
    var x = parseInt(word.boundingBox.split(',')[0]);
    return x;
}
function getY(word) {
    var y = parseInt(word.boundingBox.split(',')[1]);
    return y;
}
function getWidth(word) {
    var width = parseInt(word.boundingBox.split(',')[2]);
    return width;
}
function getHeight(word) {
    var height = parseInt(word.boundingBox.split(',')[3]);
    return height;
}
app.listen(4000);
function findFirstLine(words) {
    for (var _i = 0, words_2 = words; _i < words_2.length; _i++) {
        var w = words_2[_i];
        if (w.content === 'Jahreseinkommen') {
            return w.id - 2;
        }
    }
}
//# sourceMappingURL=server.js.map