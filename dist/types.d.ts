export declare class YearEntry {
    year: number;
    income: number;
    confidence: number;
}
export declare type Document = {
    pages: Page[];
};
export declare type Page = {
    elements: Element[];
};
export declare type Element = {
    content: Content[];
};
export declare type Content = {
    content: TextContent[];
};
export declare type TextContent = {
    id: number;
    conf: number;
    content: string;
};
