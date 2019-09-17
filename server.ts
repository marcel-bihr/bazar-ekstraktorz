import express from 'express';
import {YearEntry, Document, Page, Element, Content, TextContent, Root, Line, Word} from './types';
import { privateEncrypt } from 'crypto';



function loggerMiddleware(request: express.Request, response: express.Response, next:express.NextFunction) {
    console.log(`${request.method} ${request.path} ${request.body}`);
    next();
}

var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;

const app = express();

app.use(express.json({limit: '50mb'}));
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
    console.log('extract end' + new Date());
    response.send(result);
});

app.post('/vision', (request, response) => {
    const rawData: Root = request.body;

    let words: Word[]= [];

    for (let r of rawData.regions) {
        for (let l of r.lines) {
            for (let w of l.words) {
              words.push(w);
            }
        }
    }
    const firstEntry= findDatori(words);
    if (!firstEntry) {
        console.log('no reference entry found (datori)');
        return
    }
    console.log('datori sono ab y ' + JSON.stringify(firstEntry));
    const tolerance= getHeight(firstEntry);
    const verticalOffset= getY(firstEntry) + tolerance;
    let table= words.filter((word: Word) => getY(word) >= verticalOffset);

    const compareByCoordinate= (a: Word, b: Word) => {
        if (Math.abs(getY(a) - getY(b)) < tolerance/2) {
            return getX(a)- getX(b);
        }
        return getY(a) - getY(b);
    }  
    table.sort(compareByCoordinate);

    console.log('sorted table ' + JSON.stringify(table));
    
    let result: YearEntry[]= [];

    let entry: Word[]= [];
    let x= 0;
    for (let w of table) {
        if(getX(w) < x) {
            // zeile ist fertig, wir verarbeiten jetzt die vorhandene
            if (entry.length>3) {
                let res= processLine(entry, tolerance);
                if (!res) {
                    break;
                }
                result.push(res);
            }
            entry= [];
            x= 0;
        } else {
            entry.push(w);
            x= getX(w);
        }
    }
    let res= processLine(entry, tolerance);
    if (res) {
        result.push(res);
    }
    let aggregated: YearEntry[]= [];
    let prev: YearEntry;
    for (let r of result) {
        if (prev) {
            if (prev.year == r.year) {
                prev.income += r.income;
            } else {
                aggregated.push(r);
                prev= r;
            }
        } else {
            aggregated.push(r);
            prev= r;
        }
    }
    console.log('vision: ' + JSON.stringify(aggregated));
    console.log('vision end' + new Date());
    response.send(aggregated);
});

function processLine(words: Word[], tolerance: number): YearEntry {
    let terms: string[]= [];
    if (!words[0]) {
        return
    } 

    let term: string= words[0].text;
    let prev = words[0];
    for (let i= 1; i< words.length; i++) {
        if ((getX(words[i]) - (getX(prev)+getWidth(prev)) > tolerance)) {
            terms.push(term);
            term= words[i].text;
            prev= words[i];
        } else {
            term= term + words[i].text;
            prev= words[i];
        }
    }
    terms.push(term);

    console.log('line: ' + JSON.stringify(terms));
    let entry= new YearEntry;
    entry.year= parseInt(terms[terms.length-3]);
    if (isNaN(entry.year)) {
        console.log('not a number: ' + terms[terms.length-3]);
        return;
    }
    let currentYear= new Date().getFullYear().toString().substring(2, 4);
    if (entry.year > parseInt(currentYear)) {
        entry.year= entry.year + 1900;
    } else {
        entry.year = entry.year + 2000;
    }
    const income= terms[terms.length-2];
    entry.income= parseInt(income.replace('\'', ''));
    if (isNaN(entry.income)) {
        console.log('not a number: ' + terms[terms.length-2]);
        return;
    }
    entry.confidence= -1;
    return entry;
}

function findDatori(word: Word[]): Word {
    for (let w of word) {
        if (w.text.startsWith('Datori') || w.text.startsWith('reddito')) {
            return w;
        }
    }
}

function getX(word: Word): number {
    const x= parseInt(word.boundingBox.split(',')[0]);
    return x;
}

function getY(word: Word): number {
    const y= parseInt(word.boundingBox.split(',')[1]);
    return y;
}

function getWidth(word: Word): number {
    const width= parseInt(word.boundingBox.split(',')[2]);
    return width;
}

function getHeight(word: Word): number {
    const height= parseInt(word.boundingBox.split(',')[3]);
    return height;
}


app.listen(4000);


function findFirstLine(words: TextContent[]): number {
    for (let w of words) {
        if (w.content === 'Jahreseinkommen') {
            return w.id-2;
        }
    }
}