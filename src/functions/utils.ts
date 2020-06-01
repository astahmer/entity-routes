import * as util from "util";

export const log = (obj: Object, options?: util.InspectOptions) =>
    console.dir(util.inspect(obj, { depth: 5, colors: true, ...options }));
