import fs from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer';

export const PATH = path.resolve(process.cwd(), 'data', 'utp.json');

export type Result = {
  id: string;
  isbn: string;
};

export const parsePage = async (
  i: number,
  browser: puppeteer.Browser,
  list: Result[],
): Promise<{results: Result[]; cont: boolean}> => {
  const page = await browser.newPage();
  await page.goto(`http://www.utp.or.jp/search/index.php?page=${i}`);

  const $sections = await page.$$('.searchResultArea > .section');
  if ($sections.length === 0) return {results: [], cont: false};

  const results = [];

  for (const $section of $sections) {
    const result = await parseSection($section);

    if (result) {
      if (list.length > 0 && list[0].id === result.id)
        return {results, cont: false};
      else results.push(result);
    }
  }
  return {results, cont: true};
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
    ? (isbnRaw as string).split('ISBN')[1].replace(/-/g, '')
    : undefined;

  return id && isbn ? {id, isbn} : undefined;
};

export const readFile = async (): Promise<Result[]> => {
  await fs.ensureFile(PATH);
  return fs
    .readFile(PATH, {encoding: 'utf-8'})
    .then((data) => (data ? JSON.parse(data) : []));
};

export const writeFile = async (list: Result[]) => {
  await fs.writeFile(PATH, JSON.stringify(list));
};

(async () => {
  const browser = await puppeteer.launch();

  const list: Result[] = await readFile();

  for (let i = 1; ; i++) {
    const {cont, results} = await parsePage(i, browser, list);
    list.push(...results);
    if (!cont) break;
  }

  writeFile(list);

  await browser.close();
})();
