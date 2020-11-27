import * as contentPriorityByCountries from './contentPriorityByCountries.json';

const countriesByLang = {};
const langByCountries = {};

for (const arr of Object.values(contentPriorityByCountries)) {
	for (const rec of arr) {
		if (!countriesByLang[rec.lng]) { countriesByLang[rec.lng] = []; }
		if (!countriesByLang[rec.lng].includes(rec.id)) {
			countriesByLang[rec.lng].push(rec.id);
		}
		if (!langByCountries[rec.id]) { langByCountries[rec.id] = rec.lng; }
	}
}

export const getCountriesWithSameLanguage = (country) => {
	const lang = langByCountries[country];
	const countries = countriesByLang[lang];
	return countries.filter((it) => it !== country);
};
