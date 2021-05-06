import fs from 'fs-extra';

export const readFile = async <T>(filePath: string): Promise<T[]> => {
  await fs.ensureFile(filePath);
  return fs
    .readFile(filePath, {encoding: 'utf-8'})
    .then((data) => (data ? JSON.parse(data) : []));
};

export const writeFile = async <T>(list: T[], filePath: string) => {
  await fs.writeFile(filePath, JSON.stringify(list));
};
