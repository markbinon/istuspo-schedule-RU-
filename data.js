/* Расписание ИСТУ СПО. Реальные данные можно вписать в MANUAL_SCHEDULE —
   они имеют приоритет; остальные группы получают стабильное расписание-шаблон. */
'use strict';

const TEACHERS = [
  'Афанасьева Л.В.','Борисова М.В.','Брохоцкая Е.М.','Бухарова Н.А.','Верхозин А.Д.',
  'Витт Т.Л.','Гаврилова Ж.Л.','Гуломов А.А.','Гурулева А.А.','Данилова Т.В.',
  'Ерыгина Н.С.','Жигунова В.В.','Загоскина Е.Б.','Кириченко К.В.','Клеймёнов В.Ф.',
  'Козак Е.А.','Коломина И.В.','Куликов И.С.','Лаптева Л.В.','Латышева Е.В.',
  'Лысых А.П.','Макогон С.Н.','Макогон П.М.','Малых А.А.','Михалёва Г.С.',
  'Моисеева А.Д.','Назимова Е.В.','Накорякова И.Б.','Немарова Ж.М.','Перетолчина Ю.Н.',
  'Плюснина А.В.','Плюснина О.М.','Почекунина Т.Б.','Родионова И.П.','Савенков Д.В.',
  'Сафонова Т.В.','Сенотрусова Т.А.','Сидорук В.В.','Терихов Д.А.','Терихова С.В.',
  'Трифонова С.И.','Ульянов Д.С.','Устюгова В.В.','Фёдоров М.В.','Холева Е.А.',
  'Чадаева В.В.','Черкашенина Т.В.','Чинская В.Э.','Чинская И.А.','Чмелёва А.С.',
  'Шешалевич Ю.В.','Шкилёва В.Е.','Эвинур Д.В.','Юрченко Т.В.'
];

const GROUPS = [
  { id:'rup-26-1',  name:'мРУП-26-1',  course:1 },
  { id:'rup-26-2',  name:'мРУП-26-2',  course:1 },
  { id:'bu-26-1',   name:'мБУ-26-1',   course:1 },
  { id:'bup-26-1',  name:'мБУП-26-1',  course:1 },
  { id:'ksk-26-1',  name:'мКСК-26-1',  course:1 },
  { id:'ksk-26-2',  name:'мКСК-26-2',  course:1 },
  { id:'toap-26-1', name:'мТОАП-26-1', course:1 },
  { id:'mtoe-26-1', name:'мМТОЭ-26-1', course:1 },
  { id:'mtoe-26-2', name:'мМТОЭ-26-2', course:1 },
  { id:'spr-26-1',  name:'мСПР-26-1',  course:1 },
  { id:'spr-26-2',  name:'мСПР-26-2',  course:1 },
  { id:'tmt-26-1',  name:'мТМТ-26-1',  course:1 },
  { id:'tmt-26-2',  name:'мТМТ-26-2',  course:1 },
  { id:'tmt-26-3',  name:'мТМТ-26-3',  course:1 },
  { id:'ksk-25-1',  name:'мКСК-25-1',  course:2 },
  { id:'ksk-25-2',  name:'мКСК-25-2',  course:2 },
  { id:'bu-25-1',   name:'мБУ-25-1',   course:2 },
  { id:'bup-25-1',  name:'мБУП-25-1',  course:2 },
  { id:'ispr-25-1', name:'мИСпр-25-1', course:2 },
  { id:'ispr-25-2', name:'мИСпр-25-2', course:2 },
  { id:'ispr-25-3', name:'мИСпр-25-3', course:2 },
  { id:'spr-25-1',  name:'мСПР-25-1',  course:2 },
  { id:'spr-25-2',  name:'мСПР-25-2',  course:2 },
  { id:'mtoe-25-1', name:'мМТОЭ-25-1', course:2 },
  { id:'mtoe-25-2', name:'мМТОЭ-25-2', course:2 },
  { id:'tmt-25-1',  name:'мТМТ-25-1',  course:2 },
  { id:'tmt-25-2',  name:'мТМТ-25-2',  course:2 },
  { id:'bu-24-1',   name:'мБУ-24-1',   course:3 },
  { id:'mtoe-24-1', name:'мМТОЭ-24-1', course:3 },
  { id:'mtoe-24-2', name:'мМТОЭ-24-2', course:3 },
  { id:'spr-24-1',  name:'мСПР-24-1',  course:3 },
  { id:'spr-24-2',  name:'мСПР-24-2',  course:3 },
  { id:'tmt-24-1',  name:'мТМТ-24-1',  course:3 }
];

const PAIR_TIMES = [
  ['08:30','10:00'], ['10:10','11:40'], ['12:10','13:40'],
  ['13:50','15:20'], ['15:30','17:00'], ['17:10','18:40']
];
const DAYS = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб'];

/* Своё реальное расписание: ключ = groupId, значение = массив из 6 дней,
   каждый день — массив пар { pair, subject, teacher, room, sub }.
   Пример: 'ksk-25-1': [ [ {pair:1,subject:'Математика',teacher:'Витт Т.Л.',room:'21-45а',sub:0} ], [],[],[],[],[] ] */
const MANUAL_SCHEDULE = {};

const COMMON = ['Математика','Информатика','Русский язык','Литература','История',
  'Обществознание','Английский язык','Физическая культура','ОБЖ','Физика','Экономика','Право'];
const EXTRA = {
  ksk:['Компьютерные сети','Операционные системы','Архитектура ЭВМ','Программирование'],
  ispr:['Программирование','Базы данных','Веб-разработка','Тестирование ПО'],
  bu:['Бухгалтерский учёт','Финансы','Статистика','Налоги и налогообложение'],
  bup:['Бухгалтерский учёт','Аудит','Финансы','Маркетинг'],
  spr:['Инженерная графика','Материаловедение','Электротехника','Охрана труда'],
  mtoe:['Электротехника','Электрические машины','Монтаж электрооборудования','Электроснабжение'],
  tmt:['Технология машиностроения','Детали машин','Метрология','Станки с ЧПУ'],
  rup:['Экономика отрасли','Менеджмент','Маркетинг','Документоведение'],
  toap:['Устройство автомобилей','Техническое обслуживание','Диагностика','Электрооборудование автомобилей']
};

function hash(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
function mulberry(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const specOf = id => id.split('-')[0];

function roomFor(r, subject){
  if (subject === 'Физическая культура') return 'Спортзал';
  if (subject === 'Информатика' || /Программир|Базы данных|Веб-/.test(subject)) return `22-${200 + Math.floor(r()*90)}`;
  return `${[12,21,22,31][Math.floor(r()*4)]}-${100 + Math.floor(r()*380)}${r()<0.18?'а':''}`;
}

function buildDay(groupId, day, parity){
  const r = mulberry(hash(`${groupId}|${day}|${parity}`));
  const pool = COMMON.concat(EXTRA[specOf(groupId)] || []);
  const count = day === 5 ? 2 + Math.floor(r()*2) : 3 + Math.floor(r()*3);
  const used = new Set(); const out = [];
  for (let p = 1; p <= count; p++){
    let s = pool[Math.floor(r()*pool.length)], guard = 0;
    while (used.has(s) && guard++ < 8) s = pool[Math.floor(r()*pool.length)];
    used.add(s);
    out.push({
      pair:p, sub:0,
      subject:s,
      teacher:TEACHERS[Math.floor(r()*TEACHERS.length)],
      room:roomFor(r, s)
    });
  }
  return out;
}

const cache = new Map();
function getSchedule(groupId, parity){
  const key = `${groupId}|${parity}`;
  if (cache.has(key)) return cache.get(key);
  let week;
  if (MANUAL_SCHEDULE[groupId]) {
    week = MANUAL_SCHEDULE[groupId].map(day => (day||[]).map(p => ({ sub:0, ...p })));
  } else {
    week = DAYS.map((_,d) => buildDay(groupId, d, parity));
  }
  cache.set(key, week);
  return week;
}

window.SCHEDULE_DATA = { TEACHERS, GROUPS, PAIR_TIMES, DAYS, DAYS_SHORT, getSchedule };
