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
app.use(express_1.default.json());
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
    // extract year income from rawData
    response.send(result);
});
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