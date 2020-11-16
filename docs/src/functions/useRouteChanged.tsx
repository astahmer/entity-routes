import { useRouter } from "next/router";
import { useEffect } from "react";

type Handler = (...evts: any[]) => void;
export function useRouteChanged({ onComplete, onStart }: { onStart?: Handler; onComplete?: Handler }) {
    const router = useRouter();
    useEffect(() => {
        onStart && router.events.on("routeChangeStart", onStart);
        onComplete && router.events.on("routeChangeComplete", onComplete);

        return () => {
            onStart && router.events.off("routeChangeStart", onStart);
            onComplete && router.events.off("routeChangeComplete", onComplete);
        };
    }, [router.events, onComplete]);
}
