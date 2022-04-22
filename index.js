import {directive, html, render} from "./web_modules/lit-html.js";
import {repeat} from './web_modules/lit-html/directives/repeat.js';
import {unsafeHTML} from './web_modules/lit-html/directives/unsafe-html.js';
import {styleMap} from './web_modules/lit-html/directives/style-map.js';
import {addDays, addYears, compareAsc, compareDesc, differenceInCalendarDays, differenceInCalendarYears, differenceInYears, format, formatDistanceToNowStrict, isPast, isSameDay, isThisYear, isToday, setYear} from './web_modules/date-fns.js';
import fr from './web_modules/date-fns/esm/locale/fr/index.js';

const dateFnsOptions = {locale: fr}
const pluralRules = new Intl.PluralRules('fr');
const dateFormat = new Intl.DateTimeFormat('fr');
const NOW = new Date();
const EZANA = "Ezana";
const MAIZEROI = "Maizeroi";
const PASTEL = "Pastel";

const langs = {
  fr: {
    age(value) {
      return value + (pluralRules.select(value) === "one" ? " an" : " ans");
    },
    agenda: "Agenda",
    byYear: "Par âge",
    parents: "Parents",
    reset: "Effacer",
    years: "Années"
  }
}
const lang = langs.fr;

let selectedView = 'agenda';
let selectedYears = [];
let selectedParents = [];
let ageSortOrder = 'asc';
let selectedFilterCategory = null;
let menuState = 'closed';

const AGENDA_COMPARATOR = (p1, p2) => {
  return compareAsc(p1.birthdayDate, p2.birthdayDate);
};
const AGE_COMPARATOR = (p1, p2) => {
  const cmp = ageSortOrder === 'asc' ? compareDesc : compareAsc;
  return cmp(p1.birthDate, p2.birthDate);
}
const p = directive((visible, body) => part => {
  const template = html`<p class="grid" style=${styleMap({display: visible ? '' : 'none'})}>${body}</p>`;
  part.setValue(template);
});

class Person {
  constructor(name, birthDate, gender, parent = null){
    this.name = name;
    this.birthDate = birthDate;
    this.birthdayDate = getNextBirthdayDate(birthDate);
    this.gender = gender;
    this.parent = parent;
    this.id = name + '-' + birthDate;
    this.dateText = format(birthDate, 'P', dateFnsOptions);
  }

  showContacts() {
    return differenceInCalendarDays(this.birthdayDate, NOW) <= 30 && (this.getBirthdayAge() < 21);
  }

  getCurrentAge() {
    return differenceInYears(new Date(), this.birthDate)
  }

  getBirthdayAge() {
    const date = this.birthDate;
    const age = differenceInCalendarYears(NOW, date);
    if (isToday(this.birthdayDate) || isThisYear(this.birthdayDate)) {
      return age;
    }

    return age + 1;
  }

  getPhrase() {
    const yearPart = lang.age(this.getBirthdayAge());
    if (isSameDay(NOW, this.birthdayDate)) {
      return `${this.name} a ${yearPart} aujourd'hui !`;
    }

    const daysToBirthday = differenceInCalendarDays(this.birthdayDate, NOW);
    
    if (daysToBirthday === 1) {
      return `${this.name} aura ${yearPart} demain !`;
    }

    const birthdayDateFormat = isThisYear(this.birthdayDate) ? 'd MMMM' : 'PPP'
    const phrase = `${this.name} aura ${yearPart} le ${format(this.birthdayDate, birthdayDateFormat, dateFnsOptions)}`

    if (daysToBirthday > 30) {
      return phrase;
    }

    return phrase + `, dans ${formatDistanceToNowStrict(this.birthdayDate, {locale: fr, roundingMethod: "ceil"})}`
  }
}

function getNextBirthdayDate(birthDate) {
  const birthdayDate = setYear(birthDate, NOW.getFullYear());

  if (isPast(addDays(birthdayDate, 1))) {
    return addYears(birthdayDate, 1)
  }

  return birthdayDate;
}

function getPersonClasses(person) {
  if (isToday(person.birthdayDate)) {
    return 'today';
  }

  const daysToBirthday = differenceInCalendarDays(person.birthdayDate, NOW);

  if (daysToBirthday === 1) {
    return 'tomorrow';
  }

  if (daysToBirthday < 30) {
    return 'verySoon';
  }

  if (daysToBirthday < 90) {
    return '';
  }

  if (daysToBirthday < 180) {
    return 'lessSoon';
  }

  return 'distant';
}

function toggleSelectedView(view) {
  selectedView = view;
  renderPage();
}

function setAgeView() {
  if (selectedView === 'age') {
    ageSortOrder = ageSortOrder === 'asc' ? 'desc' : 'asc';
  }
  toggleSelectedView('age');
}

function yearClickHandler(event) {
  const filter = event.currentTarget;
  if (filter.dataset.value === 'clear') {
    selectedYears = [];
  } else {
    const year = parseInt(filter.dataset.value);
    if (selectedYears.includes(year)) {
      selectedYears = selectedYears.filter(selectedYear => selectedYear !== year);
    } else {
      selectedYears.push(year)
    }
  }

  renderPage();
}

function parentClickHandler(event) {
  const filter = event.currentTarget;
  if (filter.dataset.value === 'clear') {
    selectedParents = [];
  } else {
    const parent = selectedParents.find(selectedParent => selectedParent.id === filter.dataset.value);
    if (parent) {
      selectedParents = selectedParents.filter(selectedParent => selectedParent !== parent);
    } else {
      selectedParents.push(allParents.find(p => p.id === filter.dataset.value));
    }
  }
  
  renderPage();
}

function hasFilters() {
  return selectedYears.length > 0 || selectedParents.length > 0;
}

function resetClickHandler() {
  selectedParents = [];
  selectedYears = [];
  renderPage();
}

function filterToggle(category) {
  if (selectedFilterCategory === category) {
    selectedFilterCategory = null;
  } else {
    selectedFilterCategory = category;
  }
  renderPage();
}

function renderPage() {
  const selectedPeople = people.filter(person => selectedYears.length === 0 || selectedYears.includes(person.birthDate.getFullYear()))
    .filter(person => selectedParents.length === 0 || selectedParents.find(parent => parent === person.parent || parent === person))
    .sort(selectedView === 'agenda' ? AGENDA_COMPARATOR : AGE_COMPARATOR);
  render(navTemplate(menuState, lang, selectedView, ageSortOrder, selectedFilterCategory), document.querySelector('nav'));
  render(peopleTemplate(selectedPeople), document.querySelector('main'));
}

const monique = new Person("Monique", new Date(1947, 2, 29), 'F');
const alex = new Person("Alex", new Date(1948, 4, 23), 'M');
const marleine = new Person("Marleine", new Date(1949, 9, 8), 'F');
const olga = new Person("Olga", new Date(1952, 1, 16), 'F');
const philippe = new Person("Philippe", new Date(1953, 6, 7), 'M');
const thael = new Person("Thaël", new Date(1978, 7, 3), 'M', philippe)
const maryline = new Person("Maryline", new Date(1978, 9, 30), 'F', monique);
const mwanji = new Person("Mwanji", new Date(1978, 10, 11), 'M', alex);
const ralph = new Person("Ralph", new Date(1981, 1, 13), 'M', olga);
const naima = new Person("Naïma", new Date(1983, 6, 22), 'F', alex);
const nathalie = new Person("Nathalie", new Date(1984, 4, 17), 'F', monique);
const jeremy = new Person("Jérémy", new Date(1984, 4, 29), 'M', philippe);
const rudy = new Person("Rudy", new Date(1985, 0, 1), 'M', olga);
const jessy = new Person("Jessy", new Date(1987, 2, 31), 'F', philippe);
const johann = new Person("Johann", new Date(1989, 10, 25), 'M', marleine);

const people = [
  monique,
  alex,
  marleine,
  olga,
  philippe,
  thael,
  maryline,
  mwanji,
  ralph,
  naima,
  nathalie,
  jeremy,
  rudy,
  new Person("Myriam", new Date(1986, 6, 29), 'F', monique),
  jessy,
  johann,
  new Person("Kadiatou Haya", new Date(2009, 10, 14), 'F', maryline),
  new Person("Keziah", new Date(2009, 11, 10), 'M', mwanji),
  new Person("Alicia", new Date(2011, 7, 24), 'F', jessy),
  new Person("David", new Date(2012, 6, 12), 'M', nathalie),
  new Person("Ayanda Lily", new Date(2012, 10, 26), 'F', mwanji),
  new Person("Dalanda Luz", new Date(2013, 4, 2), 'F', maryline),
  new Person("Mathys", new Date(2015, 7, 1), 'M', nathalie),
  new Person("Haydël", new Date(2016, 0, 30), 'M', thael),
  new Person("Seun", new Date(2016, 7, 12), 'M', naima),
  new Person("Moana", new Date(2017, 8, 5), 'F', mwanji),
  new Person("Stéphane", new Date(2018, 2, 6), 'M', jessy),
  new Person("Jenna", new Date(2018, 9, 31), 'F', johann),
  new Person("Marlo", new Date(2020, 0, 9), 'M', ralph),
  new Person("Maïvee", new Date(2020, 2, 23), 'F', thael),
  new Person("Poety", new Date(2020, 2, 23), 'F', thael),
  new Person("Ely", new Date(2020, 3, 25), 'F', jeremy),
  new Person("Luana Nour", new Date(2021, 4, 20, 'F', naima),
  new Person("James Hector", new Date(2022, 4, 7, 'M'), rudy)
]

const allYears = Array.from(people.map(person => person.birthDate.getFullYear()).reduce((years, year) => {
  years.add(year);
  return years;
}, new Set()));
const allParents = Array.from(people.filter(person => person.parent)
  .map(person => person.parent)
  .sort((p1, p2) => p1.name.localeCompare(p2.name))
  .reduce((parents, parent) => {
    parents.add(parent);
    return parents;
  }, new Set()));

const contactsTemplate = (person) => html`<div class="contacts">Envoyez vos souhaits via ${person.parent.name}</div>`;
const personTemplate = person => html`<div title="${dateFormat.format(person.birthDate)}" class="person ${getPersonClasses(person)}">
  ${person.getPhrase()}
  ${person.showContacts() ? contactsTemplate(person) : ''}
</div>`;
const peopleTemplate = people => repeat(people, person => person.id, personTemplate);
const filterTemplate = (filter, clickHandler, label, selected, value) => html`<button @click=${clickHandler} class="${selected ? 'selected' : ''}" data-filter=${filter} data-value=${value}>${label}</button>`;
const filterCategoryTemplate = (category, label, selectedFilterCategory) => html`<button @click=${filterToggle.bind(null, category)} class="${selectedFilterCategory === category ? 'selected' : ''}" data-filter-category=${category}>${label}</button>`;
const yearFilterTemplate = year => filterTemplate('year', yearClickHandler, year, selectedYears.includes(year), year);
const yearFiltersTemplate = (selectedFilterCategory) => p(selectedFilterCategory === 'year', repeat(allYears, y => y, yearFilterTemplate));
const parentFilterTemplate = person => filterTemplate('parent', parentClickHandler, person.name, selectedParents.includes(person), person.id);
const parentsFilterTemplate = (selectedFilterCategory) => p(selectedFilterCategory === 'parent', repeat(allParents, parent => parent.id, parentFilterTemplate));

const badgeTemplate = (clickHandler, value, label = value) => html`<span class="badge" @click=${clickHandler} data-value=${value}>${label} x</span>`
const menuTemplate = (lang, view, ageSortOrder, category) => html`
  <p style="display: flex; justify-content: center;">
    <button @click=${toggleSelectedView.bind(null, 'agenda')} class="${view === 'agenda' ? 'selected' : ''}">${lang.agenda}</button>
    <button @click=${setAgeView} class="${view === 'age' ? 'selected' : ''}">${lang.byYear} ${unsafeHTML(ageSortOrder === 'asc' ? '&#8593;' : '&#8595;')}</button>
  </p>
  <div id="selected-values">
    ${p(selectedYears.length > 0, repeat(selectedYears, y => y, year => badgeTemplate(yearClickHandler, year)))}
    ${p(selectedParents.length > 0, repeat(selectedParents, parent => parent.id, parent => badgeTemplate(parentClickHandler, parent.id, parent.name)))}
  </div>
  <p>
    ${filterCategoryTemplate("year", lang.years, category)}
    ${filterCategoryTemplate("parent", lang.parents, category)}
    ${hasFilters() ? filterTemplate("reset", resetClickHandler, lang.reset, false, "reset") : ''}
  </p>
  ${parentsFilterTemplate(category)}
  ${yearFiltersTemplate(category)}
`;
const navTemplate = (navState, lang, view, ageSortOrder, category) => html`${navState === 'open' ? menuTemplate(lang, view, ageSortOrder, category) : ''}`;

document.getElementById('menu-button').addEventListener('click', () => {
  menuState = menuState === 'open' ? 'closed' : 'open';
  renderPage();
})

renderPage();
