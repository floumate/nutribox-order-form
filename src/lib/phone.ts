import intlTelInput from "intl-tel-input/intlTelInputWithUtils";
import "intl-tel-input/styles";

// =====================================================================
// Telefon — intl-tel-input (međunarodni broj, zastavica, pozivni broj,
// auto-detekcija zemlje preko geoIP, validacija). "WithUtils" build da
// validacija radi odmah, bez async učitavanja utils-a.
// =====================================================================

let iti: ReturnType<typeof intlTelInput> | null = null;

export function initPhone(input: HTMLInputElement): void {
  iti = intlTelInput(input, {
    initialCountry: "auto",
    separateDialCode: true,
    geoIpLookup: (cb) => {
      // cb je tipovan kao union ISO kodova; tretiramo ga kao string.
      const setCountry = cb as (countryCode: string) => void;
      // Timeout — ipapi.co je free API i ume da visi; fallback na "rs".
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      fetch("https://ipapi.co/json/", { signal: controller.signal })
        .then((res) => res.json())
        .then((data) =>
          setCountry(
            data?.country_code ? String(data.country_code).toLowerCase() : "rs",
          ),
        )
        .catch(() => setCountry("rs"))
        .finally(() => clearTimeout(timer));
    },
  });

  // Izloži globalno (kao stara forma — kompatibilnost + debug).
  (window as unknown as { iti?: typeof iti }).iti = iti;
}

/** E.164 broj (npr. +381641234567) ili "" ako nije inicijalizovan. */
export function getPhoneNumber(): string {
  return iti ? iti.getNumber() : "";
}

export function isPhoneValid(): boolean {
  return iti ? !!iti.isValidNumber() : false;
}
