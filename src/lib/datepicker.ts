import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

// =====================================================================
// Početni datum dostave (flatpickr). Min = danas + 2 dana; isključeni
// praznici; srpski locale; readonly input.
// =====================================================================

// Datumi koji se ne mogu izabrati (format d-m-Y). Klijent dopunjava.
const DISABLED_DATES = ["01-05-2026", "02-05-2026", "03-05-2026"];

export function initDatepicker(
  input: HTMLInputElement,
  onChange: (value: string) => void,
): void {
  const minFutureDate = new Date();
  minFutureDate.setDate(minFutureDate.getDate() + 2);

  flatpickr(input, {
    dateFormat: "d.m.Y",
    minDate: minFutureDate,
    disable: DISABLED_DATES,
    disableMobile: true,
    allowInput: false,
    clickOpens: true,
    locale: {
      firstDayOfWeek: 1,
      weekdays: {
        shorthand: ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"],
        longhand: [
          "Nedelja",
          "Ponedeljak",
          "Utorak",
          "Sreda",
          "Četvrtak",
          "Petak",
          "Subota",
        ],
      },
      months: {
        shorthand: [
          "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
          "Jul", "Avg", "Sep", "Okt", "Nov", "Dec",
        ],
        longhand: [
          "Januar", "Februar", "Mart", "April", "Maj", "Jun",
          "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
        ],
      },
    },
    onChange: (_dates, dateStr) => onChange(dateStr),
    onReady: (_dates, _str, inst) => {
      inst.input.addEventListener("click", () => inst.open());
    },
  });
}
