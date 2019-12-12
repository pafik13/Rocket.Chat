import * as geojsonhint from '@mapbox/geojsonhint';

export const validateGeoJSON = function(geoJSON) {
	let result = '';
	const locationErrors = geojsonhint.hint(geoJSON);
	if (locationErrors.length) {
		result = locationErrors.map((it) => it.message).join(', ');
	} else if (geoJSON.type.toLowerCase() === 'point') {
		const lng = geoJSON.coordinates[0];
		const lat = geoJSON.coordinates[1];
		if (lng < -180 && lng > 180) {
			result = 'Valid longitude values are between -180 and 180, both inclusive.';
		}
		if (lat < -90 && lat > 90) {
			result = 'Valid latitude values are between -90 and 90, both inclusive.';
		}
	}
	return result;
};
