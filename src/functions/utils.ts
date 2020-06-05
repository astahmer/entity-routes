import * as util from "util";

export const log = (obj: Object, options?: util.InspectOptions) =>
    console.dir(util.inspect(obj, { depth: 3, colors: true, ...options }));
