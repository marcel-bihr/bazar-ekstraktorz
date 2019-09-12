import express from 'express';
import {YearEntry, Document, Page, Element, Content, TextContent} from './types';



function loggerMiddleware(request: express.Request, response: express.Response, next:express.NextFunction) {
    console.log(`${request.method} ${request.path} ${request.body}`);
    next();
}

var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;

const app = express();

app.use(express.json());
app.use(loggerMiddleware);


app.post('/extract', (request, response) => {
    const rawData: Document = request.body;

    let words: TextContent[]= [];

    for (let p of rawData.pages) {
        for (let e of p.elements) {
            for (let c of e.content) {
                for (let t of c.content) {
                    words.push(t);
                }
            }
        }
    }

    const compareById= (a: TextContent, b: TextContent) => {
        return a.id - b.id;
    }  
    words.sort( compareById );

    for (let w of words) {
        console.log(w.id + ': ' + w.content + ' \t\tconfidence ' + w.conf);
    }

    const firstEntry= findFirstLine(words); 

    let table= words.filter((word: TextContent) => word.id >= firstEntry);

    let result: YearEntry[]= [];

    for (let i= 0; i < table.length; i++) {
        let entry= new YearEntry;
        const year= table[i++];
        entry.year= parseInt(year.content);
        if (isNaN(entry.year)) {
            console.log('not a number: ' + year.content);
            break;
        }
        const income= table[i++];
        entry.income= parseInt(income.content.replace('\'', ''));
        if (isNaN(entry.income)) {
            console.log('not a number: ' + income.content);
            break;
        }
        entry.confidence= Math.min(year.conf, income.conf);
        result.push(entry);
    }
    
    // extract year income from rawData
    response.send(result);
});

app.listen(4000);


function findFirstLine(words: TextContent[]): number {
    for (let w of words) {
        if (w.content === 'Jahreseinkommen') {
            return w.id-2;
        }
    }
}