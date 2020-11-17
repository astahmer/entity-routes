const title = "entity-routes";
const description = "Design your REST API around your TypeORM entities in minutes.";
const siteUrl = "https://entity-routes.vercel.app/";
const username = "@astahmer_dev";

const titleWithDescription = `${title}: ${description}`;

export const seoConfig = {
    title,
    description,
    siteUrl,
    canonical: siteUrl,
    titleTemplate: `%s - ${title}`,
    twitter: {
        handle: username,
        site: username,
        cardType: "summary_large_image",
    },
    openGraph: {
        title,
        description,
        type: "website",
        locale: "en_US",
        url: siteUrl,
        site_name: titleWithDescription,
        images: [
            {
                url: "/og-image.png",
                width: 1240,
                height: 480,
                alt: titleWithDescription,
            },
            {
                url: "/twitter-og-image.png",
                width: 1012,
                height: 506,
                alt: titleWithDescription,
            },
        ],
        profile: { username },
    },
};
