"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
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
    console.log('input: ' + JSON.stringify(rawData));
    var result;
    // extract year income from rawData
    response.send(result);
});
app.listen(4000);
//# sourceMappingURL=server.js.map