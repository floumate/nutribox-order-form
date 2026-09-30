import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import type { Instance } from "flatpickr/dist/types/instance";
import { getLang, onLangChange } from "./i18n";
import type { Lang } from "../types";

// =====================================================================
// Zajednički flatpickr (sr / en / ru). Koristi se za datum dostave i
// datum rođenja (sa različitim min/max/disable pravilima).
// Vrednost je uvek d.m.Y - po jeziku se menjaju samo nazivi dana i meseci.
// =====================================================================

type FlatpickrOptions = Parameters<typeof flatpickr>[1];

// Datumi koji se ne mogu izabrati za dostavu (format d-m-Y). Klijent dopunjava.
const DELIVERY_DISABLED_DATES = ["01-05-2026", "02-05-2026", "03-05-2026"];

type Week = [string, string, string, string, string, string, string];
type Year = [
  string, string, string, string, string, string,
  string, string, string, string, string, string,
];

interface CalendarLocale {
  firstDayOfWeek: number;
  weekdays: { shorthand: Week; longhand: Week };
  months: { shorthand: Year; longhand: Year };
}

const LOCALES: Record<Lang, CalendarLocale> = {
  sr: {
    firstDayOfWeek: 1,
    weekdays: {
      shorthand: ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"],
      longhand: [
        "Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota",
      ],
    },
    months: {
      shorthand: ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"],
      longhand: [
        "Januar", "Februar", "Mart", "April", "Maj", "Jun",
        "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
      ],
    },
  },
  en: {
    firstDayOfWeek: 1,
    weekdays: {
      shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      longhand: [
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
      ],
    },
    months: {
      shorthand: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      longhand: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ],
    },
  },
  ru: {
    firstDayOfWeek: 1,
    weekdays: {
      shorthand: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
      longhand: [
        "Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота",
      ],
    },
    months: {
      shorthand: ["Янв", "Фев", "Март", "Апр", "Май", "Июнь", "Июль", "Авг", "Сен", "Окт", "Ноя", "Дек"],
      longhand: [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
      ],
    },
  },
};

/** Svi kalendari na stranici - promena jezika prevodi i njih. */
const instances = new Set<Instance>();

onLangChange(() => {
  instances.forEach((fp) => {
    // Kalendar iz pregleda porudžbine nestaje posle "Sačuvaj".
    if (!fp.input.isConnected) {
      instances.delete(fp);
      return;
    }
    fp.set("locale", LOCALES[getLang()]);
  });
});

export function initDatepicker(
  input: HTMLInputElement,
  onChange: (value: string) => void,
  overrides: FlatpickrOptions = {},
): void {
  const minFutureDate = new Date();
  minFutureDate.setDate(minFutureDate.getDate() + 2);

  const fp = flatpickr(input, {
    dateFormat: "d.m.Y",
    minDate: minFutureDate,
    disable: DELIVERY_DISABLED_DATES,
    disableMobile: true,
    allowInput: false,
    clickOpens: true,
    locale: LOCALES[getLang()],
    onChange: (_dates, dateStr) => onChange(dateStr),
    onReady: (_dates, _str, inst) => {
      inst.input.addEventListener("click", () => inst.open());
    },
    ...overrides,
  });
  instances.add(fp);
}

/** Datum rođenja - bez min-datuma buducnosti, max = danas, bez isključenih praznika. */
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
