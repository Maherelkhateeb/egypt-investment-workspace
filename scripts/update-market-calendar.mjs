import fs from 'node:fs';
import Calendar from '../market-calendar.js';
const data=Calendar.validate(JSON.parse(fs.readFileSync('market-calendar.json','utf8')));
const news=JSON.parse(fs.readFileSync('news.json','utf8'));
data.candidates=Calendar.candidates(Array.isArray(news)?news:news.items).slice(0,40);
data.news_checked_at=new Date().toISOString();
fs.writeFileSync('market-calendar.json',JSON.stringify(data,null,2)+'\n');
console.log('Calendar news notices:',data.candidates.length,'; only reviewed closures affect session status.');
