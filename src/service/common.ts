// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOptionalStringProperty (data : {[key: string] : any}, prop : string) : string {
	return prop in data ? data[prop] : '';
}
export type ObjectCheck = {
	type : string,
	props : {
		[key : string] : {
			type : string,
			value? : string | number,
			values? : string[] | number[],
			optional? : boolean,
			emptyArray? : boolean
		}
	}
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertObject (data : any, check : ObjectCheck) {
	if (typeof data !== 'object') {
		throw Error(`Data for type '${check.type}' is not an object`);
	}
	for (const [
		prop,
		value
	] of Object.entries(check.props)) {
		if (!(prop in data) && !value.optional) {
			throw Error(`Data for type '${check.type}' does not have a '${prop}' property`);
		} else if (!value.optional) {
			if (value.type === 'array' && !Array.isArray(data[prop])) {
				throw Error(`Property '${prop}' in data for type '${check.type}' is not an array`);
			} else if (value.type !== 'array' && typeof data[prop] !== value.type) {
				throw Error(`Property '${prop}' in data for type '${check.type}' is an invalid type, ` +
					`expected '${value.type}', found '${typeof data[prop]}'`);
			}
			if (value.value && data[prop] !== value.value) {
				throw Error(`Property '${prop}' in data for type '${check.type}' has an invalid value, ` +
					`expected '${value.value}', found '${data[prop]}'`);
			}
			if (value.values && !value.values.some(v => data[prop] === v)) {
				throw Error(`Property '${prop}' in data for type '${check.type}' has an invalid value, ` +
					`expected one of '[${value.values.join(',')}]', found '${data[prop]}'`);
			}
		}
	}
}
