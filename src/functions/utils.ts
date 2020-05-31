import * as util from "util";

export const log = (obj: Object) => console.dir(util.inspect(obj, { depth: null, colors: true }));
