export function trackPageview(url: string) {
    setTimeout(() => {
        const _window = window as typeof window & { gtag: any };

        try {
            _window.gtag("config", process.env.NEXT_PUBLIC_GA_TRACKING_ID, {
                page_location: url,
                page_title: document.title,
            });
        } catch (err) {
            console.error("Failed sending metrics", err);
        }
    }, 0);
}

type TrackEventOptions = {
    action: any;
    category: string;
    label: string;
    value: string;
};

export function trackEvent(options: TrackEventOptions) {
    const { action, category, label, value } = options;
    const _window = window as typeof window & { gtag: any };
    try {
        _window.gtag("event", action, {
            event_category: category,
            event_label: label,
            value,
        });
    } catch (err) {
        console.error("Failed sending metrics", err);
    }
}
