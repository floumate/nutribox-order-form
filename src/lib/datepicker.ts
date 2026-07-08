import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

// =====================================================================
// Zajednički flatpickr (srpski locale). Koristi se za datum dostave i
// datum rođenja (sa različitim min/max/disable pravilima).
// =====================================================================

type FlatpickrOptions = Parameters<typeof flatpickr>[1];

// Datumi koji se ne mogu izabrati za dostavu (format d-m-Y). Klijent dopunjava.
const DELIVERY_DISABLED_DATES = ["01-05-2026", "02-05-2026", "03-05-2026"];

const WEEKDAYS_SHORT: [string, string, string, string, string, string, string] =
  ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"];
const WEEKDAYS_LONG: [string, string, string, string, string, string, string] = [
  "Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota",
];
const MONTHS_SHORT: [
  string, string, string, string, string, string,
  string, string, string, string, string, string,
] = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"];
const MONTHS_LONG: [
  string, string, string, string, string, string,
  string, string, string, string, string, string,
] = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const SR_LOCALE = {
  firstDayOfWeek: 1,
  weekdays: { shorthand: WEEKDAYS_SHORT, longhand: WEEKDAYS_LONG },
  months: { shorthand: MONTHS_SHORT, longhand: MONTHS_LONG },
};

export function initDatepicker(
  input: HTMLInputElement,
  onChange: (value: string) => void,
  overrides: FlatpickrOptions = {},
): void {
  const minFutureDate = new Date();
  minFutureDate.setDate(minFutureDate.getDate() + 2);

  flatpickr(input, {
    dateFormat: "d.m.Y",
    minDate: minFutureDate,
    disable: DELIVERY_DISABLED_DATES,
    disableMobile: true,
    allowInput: false,
    clickOpens: true,
    locale: SR_LOCALE,
    onChange: (_dates, dateStr) => onChange(dateStr),
    onReady: (_dates, _str, inst) => {
      inst.input.addEventListener("click", () => inst.open());
    },
    ...overrides,
  });
}

/** Datum rođenja — bez min-datuma buducnosti, max = danas, bez isključenih praznika. */
export function initBirthDatepicker(
  input: HTMLInputElement,
  onChange: (value: string) => void,
): void {
  initDatepicker(input, onChange, {
    minDate: undefined,
    maxDate: new Date(),
    disable: [],
  });
}
