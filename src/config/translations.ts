import type { DietId, Lang, PackageId, PaymentMethod, PlanId, Sex } from "../types";
import { GOALS } from "./goals";
import { PLANS } from "./plans";
import { DIET_TYPES } from "./dietTypes";
import { ALLERGENS_BY_DIET } from "./allergens";
import { PACKAGES, PACKAGE_GROUPS, type PackageGroup } from "./packages";
import { PAYMENT_OPTIONS } from "./payments";

// =====================================================================
// PREVODI forme (en / ru).
//
// Srpski tekst interfejsa je ovde isti kao u index.html. Srpski nazivi
// opcija (paketi, jelovnici, namirnice...) se PREUZIMAJU iz config-a, da
// ne postoje na dva mesta.
//
// Ključevi opcija su id-jevi (plan, jelovnik, paket) ili srpske VREDNOSTI
// (cilj, namirnica) - te vrednosti idu u payload i nikad se ne prevode.
// Nova opcija bez prevoda se prikazuje na srpskom.
// =====================================================================

const SR_UI = {
  // Navigacija
  navNext: "Dalje",
  navBack: "Nazad",
  order: "Poruči",
  loading: "Učitavanje...",

  // Naslovi koraka
  goalTitle: "Izaberi cilj koji želiš da ostvariš",
  sexTitle: "Želiš da poručiš paket za",
  planTitle: "Izaberi svoj paket",
  dietTitle: "Izaberi svoj tip jelovnika",
  excludeTitle: "Iz svakog od naših jelovnika možete izbaciti najviše 2:",
  packageTitle: "Izaberi plan koji ti najviše odgovara",
  infoTitle: "Tvoje informacije",
  dateTitle: "Početni datum dostave",
  dateSubtitle: "Izaberi kada želiš da krene dostava.",
  addressTitle: "Unesite podatke za dostavu",
  paymentTitle: "Način plaćanja",

  // Lične informacije
  firstName: "Ime",
  firstNamePh: "Petar",
  lastName: "Prezime",
  lastNamePh: "Petrović",
  birthDate: "Datum rođenja",
  birthDatePh: "Unesite datum rođenja",
  email: "Email",
  emailPh: "petar@email.com",
  phone: "Broj telefona",
  startDatePh: "Unesite datum početka dostave",

  // Dostava
  zone: "Zona dostave",
  zonePh: "Izaberite zonu",
  street: "Adresa",
  streetPh: "npr. Petra Petrovića",
  houseNumber: "Kućni broj",
  houseNumberPh: "npr. 14",
  floor: "Broj sprata",
  floorPh: "npr. 3",
  apartment: "Broj stana",
  apartmentPh: "npr. 12",
  doorCode: "Šifra ulaznih vrata",
  doorCodePh: "Šifra",
  driverNotes: "Instrukcije za vozača",
  driverNotesPh: "Ako nemate instrukcija ostavite prazno polje",
  deliveryNote:
    "Naša standardna dostava vrši se svakog dana u periodu od 7:30 do 9:30 časova. " +
    "Ukoliko vam je potrebna lična predaja, kurir će vas kontaktirati pre dolaska. " +
    "Za beskontaktne isporuke, obroci se mogu ostaviti prema vašim uputstvima.",

  // Plaćanje preko firme
  companyTitle: "Plaćanje preko firme",
  companyDesc: "Na mejl koji ste uneli u formi će Vam stići popunjena faktura.",
  companyName: "Naziv firme",
  companyAddress: "Adresa firme",
  companyEmail: "Email firme",
  companyEmailHint: "(na ovom email-u ćemo vam poslati fakturu)",
  companyPib: "PIB",
  companyMb: "Matični broj",

  // Saglasnost
  consentTerms: "Pročitao/la sam i prihvatam Opšte uslove korišćenja",
  consentPrivacy:
    "Pročitao/la sam Politiku privatnosti i slažem se sa obradom mojih " +
    "ličnih podataka u skladu sa njom",

  // Makroi na karticama paketa
  protein: "Proteini",
  carbs: "UH",
  fat: "Masti",

  // Pregled porudžbine (korak plaćanja)
  sumPlan: "Plan",
  sumSex: "Pol",
  sumDiet: "Tip jelovnika",
  sumPackage: "Paket",
  sumDate: "Datum dostave",
  sumZone: "Zona dostave",
  sumAddress: "Adresa",
  sumEdit: "Izmeni",
  sumSave: "Sačuvaj",
  sumTotal: "Ukupno",

  // Greške
  errGoal: "Molimo izaberite cilj.",
  errSex: "Molimo izaberite pol.",
  errPlan: "Molimo izaberite paket.",
  errDiet: "Molimo izaberite tip jelovnika.",
  errPackage: "Molimo izaberite plan.",
  errName: "Molimo unesite ime i prezime.",
  errBirthDate: "Molimo unesite datum rođenja.",
  errEmail: "Molimo unesite ispravan email.",
  errPhoneEmpty: "Molimo unesite broj telefona.",
  errPhoneInvalid: "Broj telefona nije ispravan.",
  errStartDate: "Molimo izaberite datum početka dostave.",
  errAddress: "Molimo izaberite zonu dostave i unesite adresu.",
  errAddressDetails: "Molimo unesite kućni broj, broj stana i broj sprata.",
  errPayment: "Molimo izaberite način plaćanja.",
  errConsent: "Morate prihvatiti uslove da biste nastavili.",
  errCompany: "Molimo popunite sva polja firme.",
  errCompanyEmail: "Email firme nije ispravan.",
  errEmailRequired: "Email je obavezan.",
  errCheckout:
    "Trenutno ne možemo da pokrenemo plaćanje karticom. Pokušajte ponovo " +
    "ili izaberite plaćanje pouzećem.",
};

export type UiKey = keyof typeof SR_UI;

const EN_UI: Record<UiKey, string> = {
  navNext: "Next",
  navBack: "Back",
  order: "Order",
  loading: "Loading...",

  goalTitle: "Choose the goal you want to achieve",
  sexTitle: "Who are you ordering the package for?",
  planTitle: "Choose your package",
  dietTitle: "Choose your menu type",
  excludeTitle: "You can exclude up to 2 of these from any of our menus:",
  packageTitle: "Choose the plan that suits you best",
  infoTitle: "Your details",
  dateTitle: "Delivery start date",
  dateSubtitle: "Choose when you want deliveries to start.",
  addressTitle: "Enter your delivery details",
  paymentTitle: "Payment method",

  firstName: "First name",
  firstNamePh: "John",
  lastName: "Last name",
  lastNamePh: "Smith",
  birthDate: "Date of birth",
  birthDatePh: "Select your date of birth",
  email: "Email",
  emailPh: "john@email.com",
  phone: "Phone number",
  startDatePh: "Select a start date",

  zone: "Delivery zone",
  zonePh: "Select a zone",
  street: "Street",
  streetPh: "e.g. Knez Mihailova",
  houseNumber: "House number",
  houseNumberPh: "e.g. 14",
  floor: "Floor",
  floorPh: "e.g. 3",
  apartment: "Apartment number",
  apartmentPh: "e.g. 12",
  doorCode: "Entrance door code",
  doorCodePh: "Code",
  driverNotes: "Instructions for the driver",
  driverNotesPh: "Leave blank if you have no instructions",
  deliveryNote:
    "We deliver every day between 7:30 and 9:30 AM. If you need the meals " +
    "handed to you in person, the courier will contact you before arriving. " +
    "For contactless delivery, meals can be left according to your instructions.",

  companyTitle: "Pay via company",
  companyDesc: "A completed invoice will be sent to the email you entered in the form.",
  companyName: "Company name",
  companyAddress: "Company address",
  companyEmail: "Company email",
  companyEmailHint: "(we'll send the invoice to this email)",
  companyPib: "Tax ID (PIB)",
  companyMb: "Registration number (MB)",

  consentTerms: "I have read and accept the Terms of Service",
  consentPrivacy:
    "I have read the Privacy Policy and agree to the processing of my " +
    "personal data in accordance with it",

  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",

  sumPlan: "Package",
  sumSex: "Ordering for",
  sumDiet: "Menu type",
  sumPackage: "Plan",
  sumDate: "Start date",
  sumZone: "Delivery zone",
  sumAddress: "Street",
  sumEdit: "Edit",
  sumSave: "Save",
  sumTotal: "Total",

  errGoal: "Please choose a goal.",
  errSex: "Please choose who the package is for.",
  errPlan: "Please choose a package.",
  errDiet: "Please choose a menu type.",
  errPackage: "Please choose a plan.",
  errName: "Please enter your first and last name.",
  errBirthDate: "Please enter your date of birth.",
  errEmail: "Please enter a valid email.",
  errPhoneEmpty: "Please enter your phone number.",
  errPhoneInvalid: "The phone number is not valid.",
  errStartDate: "Please choose a delivery start date.",
  errAddress: "Please choose a delivery zone and enter your street.",
  errAddressDetails: "Please enter your house number, apartment number and floor.",
  errPayment: "Please choose a payment method.",
  errConsent: "You must accept the terms to continue.",
  errCompany: "Please fill in all company fields.",
  errCompanyEmail: "The company email is not valid.",
  errEmailRequired: "Email is required.",
  errCheckout:
    "We can't start the card payment right now. Please try again or choose " +
    "cash on delivery.",
};

const RU_UI: Record<UiKey, string> = {
  navNext: "Далее",
  navBack: "Назад",
  order: "Заказать",
  loading: "Загрузка...",

  goalTitle: "Выберите цель, которой хотите достичь",
  sexTitle: "Для кого вы заказываете пакет?",
  planTitle: "Выберите свой пакет",
  dietTitle: "Выберите тип меню",
  excludeTitle: "Из любого нашего меню можно исключить не более 2 позиций:",
  packageTitle: "Выберите план, который вам больше подходит",
  infoTitle: "Ваши данные",
  dateTitle: "Дата начала доставки",
  dateSubtitle: "Выберите, с какого дня начать доставку.",
  addressTitle: "Укажите данные для доставки",
  paymentTitle: "Способ оплаты",

  firstName: "Имя",
  firstNamePh: "Иван",
  lastName: "Фамилия",
  lastNamePh: "Иванов",
  birthDate: "Дата рождения",
  birthDatePh: "Укажите дату рождения",
  email: "Email",
  emailPh: "ivan@email.com",
  phone: "Номер телефона",
  startDatePh: "Выберите дату начала",

  zone: "Зона доставки",
  zonePh: "Выберите зону",
  street: "Улица",
  streetPh: "напр. Knez Mihailova",
  houseNumber: "Номер дома",
  houseNumberPh: "напр. 14",
  floor: "Этаж",
  floorPh: "напр. 3",
  apartment: "Номер квартиры",
  apartmentPh: "напр. 12",
  doorCode: "Код домофона",
  doorCodePh: "Код",
  driverNotes: "Инструкции для курьера",
  driverNotesPh: "Если инструкций нет, оставьте поле пустым",
  deliveryNote:
    "Доставка — каждый день с 7:30 до 9:30. Если нужно передать заказ лично " +
    "в руки, курьер свяжется с вами перед приездом. При бесконтактной " +
    "доставке еду оставят согласно вашим инструкциям.",

  companyTitle: "Оплата через компанию",
  companyDesc: "Заполненный счёт придёт на email, указанный в форме.",
  companyName: "Название компании",
  companyAddress: "Адрес компании",
  companyEmail: "Email компании",
  companyEmailHint: "(на этот email мы отправим счёт)",
  companyPib: "ИНН (PIB)",
  companyMb: "Регистрационный номер (MB)",

  consentTerms: "Я прочитал(а) и принимаю Условия использования",
  consentPrivacy:
    "Я прочитал(а) Политику конфиденциальности и согласен(на) на обработку " +
    "моих персональных данных в соответствии с ней",

  protein: "Белки",
  carbs: "Углеводы",
  fat: "Жиры",

  sumPlan: "Пакет",
  sumSex: "Для кого",
  sumDiet: "Тип меню",
  sumPackage: "План",
  sumDate: "Дата начала",
  sumZone: "Зона доставки",
  sumAddress: "Улица",
  sumEdit: "Изменить",
  sumSave: "Сохранить",
  sumTotal: "Итого",

  errGoal: "Пожалуйста, выберите цель.",
  errSex: "Пожалуйста, выберите, для кого пакет.",
  errPlan: "Пожалуйста, выберите пакет.",
  errDiet: "Пожалуйста, выберите тип меню.",
  errPackage: "Пожалуйста, выберите план.",
  errName: "Пожалуйста, укажите имя и фамилию.",
  errBirthDate: "Пожалуйста, укажите дату рождения.",
  errEmail: "Пожалуйста, укажите корректный email.",
  errPhoneEmpty: "Пожалуйста, укажите номер телефона.",
  errPhoneInvalid: "Номер телефона указан неверно.",
  errStartDate: "Пожалуйста, выберите дату начала доставки.",
  errAddress: "Пожалуйста, выберите зону доставки и укажите улицу.",
  errAddressDetails: "Пожалуйста, укажите номер дома, квартиры и этаж.",
  errPayment: "Пожалуйста, выберите способ оплаты.",
  errConsent: "Чтобы продолжить, примите условия.",
  errCompany: "Пожалуйста, заполните все поля компании.",
  errCompanyEmail: "Email компании указан неверно.",
  errEmailRequired: "Email обязателен.",
  errCheckout:
    "Сейчас не удаётся начать оплату картой. Попробуйте ещё раз или " +
    "выберите оплату при получении.",
};

export const UI: Record<Lang, Record<UiKey, string>> = {
  sr: SR_UI,
  en: EN_UI,
  ru: RU_UI,
};

// ---------------------------------------------------------------------
// Nazivi opcija
// ---------------------------------------------------------------------

export interface DataLabels {
  /** Ključ = srpska vrednost cilja (u payload ide kao `motivacija`). */
  goals: Record<string, string>;
  sex: Record<Sex, string>;
  planTagline: Record<PlanId, string>;
  diets: Record<DietId, { label: string; description: string }>;
  /** Ključ = srpski naziv namirnice (u payload i Nikoli ide srpski). */
  allergens: Record<string, string>;
  packages: Record<PackageId, { name: string; subtitle: string }>;
  packageGroups: Record<PackageGroup, string>;
  payments: Record<PaymentMethod, { title: string; desc: string }>;
}

function mapBy<T, K extends string, V>(
  items: readonly T[],
  key: (item: T) => K,
  value: (item: T) => V,
): Record<K, V> {
  return Object.fromEntries(items.map((i) => [key(i), value(i)])) as Record<K, V>;
}

const ALL_ALLERGENS = [...new Set(Object.values(ALLERGENS_BY_DIET).flat())];

const SR_DATA: DataLabels = {
  goals: mapBy(GOALS, (g) => g, (g) => g),
  // Prikaz; vrednost ostaje "Muški"/"Ženski" (makroi/Airtable/Nikola).
  sex: { Muški: "Muškarca", Ženski: "Ženu" },
  planTagline: mapBy(PLANS, (p) => p.id, (p) => p.tagline),
  diets: mapBy(DIET_TYPES, (d) => d.id, (d) => ({ label: d.label, description: d.description })),
  allergens: mapBy(ALL_ALLERGENS, (a) => a, (a) => a),
  packages: mapBy(PACKAGES, (p) => p.id, (p) => ({ name: p.name, subtitle: p.subtitle })),
  packageGroups: mapBy(PACKAGE_GROUPS, (g) => g.id, (g) => g.label),
  payments: mapBy(PAYMENT_OPTIONS, (o) => o.value, (o) => ({ title: o.title, desc: o.desc })),
};

const EN_DATA: DataLabels = {
  goals: {
    "Želim da smršam": "I want to lose weight",
    "Želim da izbalansiram ishranu": "I want to balance my diet",
    "Želim da povećam mišićnu masu": "I want to build muscle",
  },
  sex: { Muški: "A man", Ženski: "A woman" },
  planTagline: {
    nutrislim: "High-protein meals for weight loss",
    nutribalance: "Perfectly balanced meals for your day",
    nutripump: "High-protein meals for building muscle",
    nutrimax: "Meals with maximum energy intake",
  },
  diets: {
    balance: {
      label: "Balanced menu",
      description: "Includes meat, fish, eggs, vegetables, fruit and dairy",
    },
    fish: {
      label: "Pescatarian menu",
      description: "Includes fish, seafood, eggs, dairy, vegetables and fruit",
    },
    vegan: {
      label: "Vegan menu",
      description: "Plant foods, grains and legumes, with no animal products whatsoever",
    },
    vegetarian: {
      label: "Vegetarian menu",
      description: "Includes vegetables, fruit, grains, legumes, eggs and dairy",
    },
  },
  allergens: {
    Gluten: "Gluten",
    Laktoza: "Lactose",
    "Orašasti plodovi": "Nuts",
    Svinjetina: "Pork",
    Riba: "Fish",
    "Morski plodovi": "Seafood",
  },
  packages: {
    "28-dnevni": { name: "28-day plan", subtitle: "A full month - every day" },
    "7-dnevni": { name: "7-day plan", subtitle: "A full week" },
    "20-dnevni": { name: "20-day plan", subtitle: "Weekdays - no weekends" },
    "5-dnevni": { name: "5-day plan", subtitle: "Work week - no weekends" },
    probni: { name: "1-day plan", subtitle: "1 day - try it before you decide" },
  },
  packageGroups: { mesecni: "Monthly", nedeljni: "Weekly", probni: "Daily" },
  payments: {
    Kartica: {
      title: "Pay by card",
      desc: "Pay right away by card; we'll email you the instructions.",
    },
    Pouzeće: {
      title: "Cash on delivery",
      desc: "Pay the courier at your first delivery; we'll email you detailed instructions.",
    },
    Firma: {
      title: "Pay via company",
      desc: "We'll email you an invoice (to the address you entered above) that you can pay.",
    },
  },
};

const RU_DATA: DataLabels = {
  goals: {
    "Želim da smršam": "Хочу похудеть",
    "Želim da izbalansiram ishranu": "Хочу сбалансировать питание",
    "Želim da povećam mišićnu masu": "Хочу набрать мышечную массу",
  },
  sex: { Muški: "Для мужчины", Ženski: "Для женщины" },
  planTagline: {
    nutrislim: "Высокобелковое питание для снижения веса",
    nutribalance: "Идеально сбалансированное питание на каждый день",
    nutripump: "Высокобелковое питание для набора мышечной массы",
    nutrimax: "Питание с максимальной калорийностью",
  },
  diets: {
    balance: {
      label: "Сбалансированное меню",
      description: "Включает мясо, рыбу, яйца, овощи, фрукты и молочные продукты",
    },
    fish: {
      label: "Рыбное меню",
      description: "Включает рыбу, морепродукты, яйца, молочные продукты, овощи и фрукты",
    },
    vegan: {
      label: "Веганское меню",
      description: "Растительные продукты, злаки и бобовые — без продуктов животного происхождения",
    },
    vegetarian: {
      label: "Вегетарианское меню",
      description: "Включает овощи, фрукты, злаки, бобовые, яйца и молочные продукты",
    },
  },
  allergens: {
    Gluten: "Глютен",
    Laktoza: "Лактоза",
    "Orašasti plodovi": "Орехи",
    Svinjetina: "Свинина",
    Riba: "Рыба",
    "Morski plodovi": "Морепродукты",
  },
  packages: {
    "28-dnevni": { name: "План на 28 дней", subtitle: "Целый месяц — каждый день" },
    "7-dnevni": { name: "План на 7 дней", subtitle: "Целая неделя" },
    "20-dnevni": { name: "План на 20 дней", subtitle: "Будни — без выходных" },
    "5-dnevni": { name: "План на 5 дней", subtitle: "Рабочая неделя — без выходных" },
    probni: { name: "План на 1 день", subtitle: "1 день — попробуйте, прежде чем решить" },
  },
  packageGroups: { mesecni: "На месяц", nedeljni: "На неделю", probni: "На день" },
  payments: {
    Kartica: {
      title: "Оплата картой",
      desc: "Оплатите сразу картой, инструкции придут на email.",
    },
    Pouzeće: {
      title: "Оплата при получении",
      desc: "Оплатите курьеру при первой доставке, подробные инструкции придут на email.",
    },
    Firma: {
      title: "Оплата через компанию",
      desc: "Мы отправим счёт на указанный выше email, по нему можно оплатить.",
    },
  },
};

export const DATA: Record<Lang, DataLabels> = {
  sr: SR_DATA,
  en: EN_DATA,
  ru: RU_DATA,
};
