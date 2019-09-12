export class YearEntry {
    year: number;
    income: number;
    confidence: number;
}

export type Document = {
    pages: Page[];
}

export type Page = {
    elements: Element[];
}

export type Element = {
    content: Content[];
}

export type Content = {
    content: TextContent[];
}

export type TextContent = {
    id: number;
    conf: number;
    content: string;
}