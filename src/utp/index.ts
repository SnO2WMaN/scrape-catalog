import path from 'path';
import puppeteer from 'puppeteer';
import {readFile, writeFile} from './file';

export const PATH = path.resolve(process.cwd(), 'data', 'utp.json');
export type Result = {
  id: string;
  isbn: string;
};

export const parseSection = async (
  $elem: puppeteer.ElementHandle<Element>,
): Promise<Result | undefined> => {
  const $a = await $elem?.$('.ttl > h2 > a');
  const href = await (await $a?.getProperty('href'))?.jsonValue();
  const id = href
    ? path.basename(href as string, path.extname(href as string))
    : undefined;

  const $detail = await $elem?.$('.detail');
  const $isbn = await $detail?.$('span:nth-child(1)');
  const isbnRaw = await (await $isbn?.getProperty('textContent'))?.jsonValue();
  const isbn = isbnRaw
    ? (isbnRaw as string).replace(/-/g, '').split('ISBN')[1]
    : undefined;

  return id && isbn ? {id, isbn} : undefined;
};

export const parsePage = async (
  i: number,
  head: Result | undefined,
  browser: puppeteer.Browser,
): Promise<{results: Result[]; cont: boolean}> => {
  const page = await browser.newPage();
  await page.goto(`http://www.utp.or.jp/search/index.php?page=${i}`);

  const $sections = await page.$$('.searchResultArea > .section');
  if ($sections.length === 0) return {results: [], cont: false};

  const results: Result[] = [];
  for (const $section of $sections) {
    const result = await parseSection($section);

    if (!result) continue;
    if (!head) results.push(result);
    else if (result.id === head.id) return {results, cont: false};
    else if (result.id !== head.id) results.push(result);
  }
  return {results, cont: true};
};

export const getDiff = async (head: Result | undefined): Promise<Result[]> => {
  const browser = await puppeteer.launch();
  const diff: Result[] = [];

  for (let i = 1; ; i++) {
    const {cont, results} = await parsePage(i, head, browser);
    diff.push(...results);
    if (!cont) break;
  }

  await browser.close();
  return diff;
};

export const main = async () => {
  const baseList: Result[] = await readFile<Result>(PATH);
  const diff: Result[] = await getDiff(baseList[0]);
  writeFile<Result>([...diff, ...baseList], PATH);
};

(async () => {
  await main();
})();
