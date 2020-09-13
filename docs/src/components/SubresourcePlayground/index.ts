import dynamic from "next/dynamic";

export const SubresourcePlayground = dynamic(
    () => import("./SubresourcePlayground").then((mod) => mod.SubresourcePlayground),
    { ssr: false }
);
