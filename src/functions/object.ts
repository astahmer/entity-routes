/** Sort object keys alphabetically */
export const sortObjectByKeys = (obj: Record<any, any>) =>
    Object.keys(obj)
        .sort()
        .reduce((acc, key) => ((acc[key] = obj[key]), acc), {} as any);

/** Get 1st key of object */
export const getObjectOnlyKey = (obj: object) => Object.keys(obj)[0];

export const getUnixTimestampFromDate = (date: Date) => Math.round(+date / 1000);

/** Set value of nested object key path */
export const setNestedKey = (obj: Record<string, any>, path: string | string[], value: any): Record<string, any> => {
    path = Array.isArray(path) ? path : path.split(".");
    if (path.length === 1) {
        obj[path[0]] = value;
        return value;
    } else if (!(path[0] in obj)) {
        obj[path[0]] = {};
    }

    return setNestedKey(obj[path[0]], path.slice(1), value);
};
