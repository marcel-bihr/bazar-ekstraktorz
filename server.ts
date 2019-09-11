import express from 'express';
import {YearIncome, YearEntry} from './types';



function loggerMiddleware(request: express.Request, response: express.Response, next:express.NextFunction) {
    console.log(`${request.method} ${request.path} ${request.body}`);
    next();
}

var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;

const app = express();

app.use(express.json());
app.use(loggerMiddleware);


app.post('/extract', (request, response) => {
    const rawData = request.body;
    console.log('input: ' + JSON.stringify(rawData));

    let result: YearIncome;
    // extract year income from rawData
    response.send(result);
});

app.listen(4000);
