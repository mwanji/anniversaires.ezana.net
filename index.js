import {html, render} from "https://unpkg.com/lit-html?module";
import {repeat} from 'https://unpkg.com/lit-html/directives/repeat?module';
import {unsafeHTML} from 'https://unpkg.com/lit-html/directives/unsafe-html?module';
import {addDays, addYears, compareAsc, compareDesc, differenceInCalendarDays, differenceInCalendarYears, differenceInYears, format, formatDistanceToNowStrict, isBefore, isFuture, isPast, isSameDay, isThisYear, isToday, setYear} from 'https://unpkg.com/date-fns@2.12.0?module';
import {fr} from 'https://unpkg.com/date-fns@2.12.0/esm/locale/index.js?module';

const dateFnsOptions = {locale: fr}
const pluralRules = new Intl.PluralRules('fr');
const dateFormat = new Intl.DateTimeFormat('fr');
const NOW = new Date();

let selectedView = 'agenda';
let selectedYears = [];
let selectedParents = [];
let ageSortOrder = 'asc';

const AGENDA_COMPARATOR = (p1, p2) => {
  return compareAsc(p1.birthdayDate, p2.birthdayDate);
};
const AGE_COMPARATOR = (p1, p2) => {
  const cmp = ageSortOrder === 'asc' ? compareDesc : compareAsc;
  return cmp(p1.birthDate, p2.birthDate);
}

class Person {
  constructor(name, birthDate, gender, parent = null){
    this.name = name;
    this.birthDate = birthDate;
    this.birthdayDate = getNextBirthdayDate(birthDate);
    this.gender = gender;
    this.parent = parent;
    this.id = name + '-' + birthDate;
    this.dateText = format(birthDate, 'P');
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
    const age = this.getBirthdayAge();
    const yearPart = `${age} an${pluralRules.select(age) !== "one" ? 's' : ''}`
    if (isSameDay(NOW, this.birthdayDate)) {
      return `${this.name} a ${yearPart} aujourd'hui !`;
    }

    const daysToBirthday = differenceInCalendarDays(this.birthdayDate, NOW);
    
    if (daysToBirthday === 1) {
      return `${this.name} aura ${yearPart} demain !`;
    }

    const birthdayDateFormat = isThisYear(this.birthdayDate) ? 'd MMMM' : 'PP'
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

function setAgendaView() {
  selectedView = 'agenda';
  renderPage();
}

function setAgeView() {
  if (selectedView !== 'age') {
    selectedView = 'age';
  } else {
    ageSortOrder = ageSortOrder === 'asc' ? 'desc' : 'asc';
  }
  renderPage();
}

function yearClickHandler(event) {
  const filter = event.currentTarget;
  if (filter.dataset.value === 'clear') {
    selectedYears = [];
  } else if (filter.dataset.value === 'all') {
    selectedYears = allYears;
  } else {
    const year = parseInt(filter.dataset.value);
    if (filter.classList.contains('selected')) {
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
  } else if (filter.dataset.value === 'all') {
    selectedParents = allParents;
  } else {
    const parent = selectedParents.find(selectedParent => selectedParent.id === filter.dataset.value);
    if (parent) {
      selectedParents = selectedParents.filter(selectedParent => selectedParent !== parent);
    } else {
      selectedParents.push(allParents.find(p => p.id === filter.dataset.value));
    }
  }
  
  renderPage()
}

function renderPage() {
  const selectedPeople = people.filter(person => selectedYears.includes(person.birthDate.getFullYear()))
    .filter(person => selectedParents.find(parent => parent === person.parent || parent === person))
    .sort(selectedView === 'agenda' ? AGENDA_COMPARATOR : AGE_COMPARATOR);
  render(peopleTemplate(selectedPeople), document.getElementById('birthdayContainer'));
  render(viewsTemplate('agenda'), document.getElementById('views'));
  render(yearFiltersTemplate(selectedYears), document.getElementById('filtersYear'));
  render(parentsFilterTemplate(selectedParents), document.getElementById('filtersParent'));
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
  new Person("Jenna", new Date(2018, 9, 31), 'F', johann),
  new Person("Marlo", new Date(2020, 0, 9), 'M', ralph),
  new Person("Maïvee", new Date(2020, 2, 23), 'F', thael),
  new Person("Poety", new Date(2020, 2, 23), 'F', thael),
  new Person("Ely", new Date(2020, 3, 25), 'F', jeremy)
]

const allYears = selectedYears = Array.from(people.map(person => person.birthDate.getFullYear()).reduce((years, year) => {
  years.add(year);
  return years;
}, new Set()));
const allParents = selectedParents = Array.from(people.filter(person => person.parent)
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
const peopleTemplate = people => html`${repeat(people, person => person.id, personTemplate)}`;
const viewsTemplate = () => html`<button @click=${setAgendaView} class=${selectedView === 'agenda' ? 'selected' : ''} data-view="agenda">Agenda</button><button @click=${setAgeView} class=${selectedView === 'age' ? 'selected' : ''}>Par âge ${unsafeHTML(ageSortOrder === 'asc' ? '&#8593;' : '&#8595;')}</button>`;
const filterTemplate = (filter, clickHandler, label, selected, value) => html`<button @click=${clickHandler} class=${selected ? 'selected' : ''} data-filter=${filter} data-value=${value}>${label}</button>`;
const yearFilterTemplate = year => html`${filterTemplate('year', yearClickHandler, year, selectedYears.includes(year), year)}`;
const yearFiltersTemplate = () => html`${repeat(allYears, y => y, yearFilterTemplate)} ${filterTemplate('year', yearClickHandler, 'x', false, 'clear')} ${filterTemplate('year', yearClickHandler, 'Toutes', false, 'all')}`;
const parentFilterTemplate = person => html`${filterTemplate('parent', parentClickHandler, person.name, selectedParents.includes(person), person.id)}`;
const parentsFilterTemplate = () => html`${repeat(allParents, parent => parent.id, parentFilterTemplate)} ${filterTemplate('parent', parentClickHandler, 'x', false, 'clear')} ${filterTemplate('parent', parentClickHandler, 'Tous', false, 'all')}`;

renderPage();
