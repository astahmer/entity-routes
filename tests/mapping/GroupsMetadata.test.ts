import { getOwnExposedProps, getExposedProps, GroupsMetadata, getGroupsMetadata } from "@/index";
import { TestGroups } from "./decorators/TestGroups";

describe("GroupsMetadata", () => {
    it("can add prop to global groups", () => {
        class User {
            @TestGroups(["create", "update"])
            name: string;
        }

        const metadata = getGroupsMetadata<GroupsMetadata>(User);
        expect(metadata.globals["create"]).toBeDefined();
        expect(metadata.globals["create"]).toBeArray();
        expect(metadata.globals["create"]).toContain("name");
    });

    it("can add prop to routes groups", () => {
        class User {
            @TestGroups({ user: ["list"] })
            name: string;
        }

        const metadata = getGroupsMetadata<GroupsMetadata>(User);
        expect(metadata.routes["user"]).toBeDefined();
        expect(metadata.routes["user"]).toEqual({
            list: ["name"],
        });
    });

    it("can add prop to all operations on all context", () => {
        class User {
            @TestGroups("all")
            name: string;
        }

        const userProps = getExposedProps(User, "user");
        expect(userProps).toEqual({
            create: ["name"],
            list: ["name"],
            details: ["name"],
            update: ["name"],
        });
    });

    it("should return own exposed props", () => {
        class AbstractEntity {
            @TestGroups(["list"])
            dateCreated: Date;
        }
        class User extends AbstractEntity {
            @TestGroups(["list"])
            id: number;

            @TestGroups(["create", "update"])
            @TestGroups({ user: ["list"] })
            name: string;
        }

        const result = {
            create: ["name"],
            update: ["name"],
            list: ["id", "name"],
        };

        const exposedProps = getOwnExposedProps(User, "user");
        expect(exposedProps).toEqual(result);
    });

    it("should return all exposed props (merged with parents) ", () => {
        class AbstractEntity {
            @TestGroups("all")
            id: number;

            @TestGroups(["list", "details"])
            dateCreated: Date;
        }

        class User extends AbstractEntity {
            @TestGroups(["create", "update"])
            @TestGroups({ user: ["list"] })
            name: string;

            @TestGroups({ user: ["details"], contact: ["list"] })
            email: string;
        }

        const userProps = getExposedProps(User, "user");
        expect(userProps).toEqual({
            create: ["name", "id"],
            details: ["email", "id", "dateCreated"],
            list: ["name", "id", "dateCreated"],
            update: ["name", "id"],
        });

        const contactProps = getExposedProps(User, "contact");
        expect(contactProps).toEqual({
            create: ["name", "id"],
            details: ["id", "dateCreated"],
            list: ["email", "id", "dateCreated"],
            update: ["name", "id"],
        });
    });
});
