const languages = new Intl.DisplayNames(["en"], { type: "language" });
const regions = new Intl.DisplayNames(["en"], { type: "region" });

/** "Spanish" for "es"; the code itself if it is not a known language. */
export function languageName(code: string): string {
  try {
    return languages.of(code) ?? code;
  } catch {
    return code;
  }
}

/** "Mexico" for "MX"; the code itself if it is not a known region. */
export function countryName(code: string): string {
  try {
    return regions.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
