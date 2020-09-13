import dynamic from "next/dynamic";

const initialState = require("./defaultConfig.json");

export const SubresourcePlayground = dynamic(
    () => import("./SubresourcePlayground").then((mod) => () => mod.SubresourcePlayground({ initialState })),
    { ssr: false }
);
