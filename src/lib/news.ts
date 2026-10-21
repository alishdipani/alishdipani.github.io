import fs from 'node:fs';
import { parse } from 'yaml';

export type NewsItem = { date: Date; text: string; link?: string };

// Items from src/data/news.yml, newest first.
export function getNews(file = 'src/data/news.yml'): NewsItem[] {
  const items = (parse(fs.readFileSync(file, 'utf8')) ?? []) as { date: string | Date; text: string; link?: string }[];
  return items
    .map((n) => ({ date: new Date(n.date), text: n.text, link: n.link }))
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());
}
