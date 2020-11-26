import { GroupsMetadata, PropsByOperations, getExposedProps, getGroupsMetadata, getOwnExposedProps } from "@/index";

import { TestGroups } from "../decorators/TestGroups";

describe("GroupsMetadata", () => {
    it("can add prop to all operations on all context", () => {
        class User {
            @TestGroups("all")
            name: string;

            @TestGroups(["customOperation"])
            email: string;
        }

        const userProps = getExposedProps(User, "user");
        expect(userProps).toEqualMessy({
            create: ["name"],
            list: ["name"],
            details: ["name"],
            update: ["name"],
            customOperation: ["name", "email"],
        });
    });

    it("can add prop to basic operations on all context", () => {
        class User {
            @TestGroups("basic")
            name: string;
        }

        const userProps = getExposedProps(User, "user");
        expect(userProps).toEqualMessy({
            create: ["name"],
            list: ["name"],
            details: ["name"],
            update: ["name"],
        });
    });

    it("can add prop to global groups - exposed props no matter which context for that operation", () => {
        class User {
            @TestGroups(["create", "update"])
            name: string;
        }

        const metadata = getGroupsMetadata<GroupsMetadata>(User);
        expect(metadata.globalOperations["create"]).toEqual(["name"]);
    });

    it("can add prop to locals groups - exposed props no matter which operation in that context", () => {
        class User {
            @TestGroups({ user: "all" })
            name: string;
        }

        const metadata = getGroupsMetadata<GroupsMetadata>(User);
        expect(metadata.localAlways["user"]).toEqual(["name"]);
    });

    it("can add prop to routes groups", () => {
        class User {
            @TestGroups({ user: ["list"] })
            name: string;
        }

        const metadata = getGroupsMetadata<GroupsMetadata>(User);
        expect(metadata.routes["user"]).toEqual({
            list: ["name"],
        });
    });

    it("should return own exposed props", () => {
        class AbstractEntity {
            @TestGroups("all")
            id: string;

            @TestGroups("basic")
            dateCreated: Date;

            @TestGroups({ user: "all" })
            creator: () => User; // wrap in fn to avoid ReferenceError: Cannot access 'User' before initialization

            @TestGroups({ role: "basic" })
            editor: () => User; // wrap in fn to avoid ReferenceError: Cannot access 'User' before initialization
        }
        class User extends AbstractEntity {
            @TestGroups(["create", "update"])
            @TestGroups({ anotherEntityContext: ["list"] })
            name: string;

            @TestGroups({ user: "basic" })
            email: string;

            @TestGroups({ user: "all" })
            birthDate: string;

            @TestGroups({ user: ["customOperation"] })
            address: string;

            @TestGroups(["list", "anotherCustom"])
            country: string;
        }

        const result = {
            create: ["name", "email", "birthDate"],
            update: ["name", "email", "birthDate"],
            list: ["country", "email", "birthDate"],
            details: ["email", "birthDate"],
            anotherCustom: ["country", "birthDate"],
            customOperation: ["address", "birthDate"],
        } as PropsByOperations;

        const ownExposedProps = getOwnExposedProps(User, "user");
        expect(ownExposedProps).toEqualMessy(result);

        const exposedProps = getExposedProps(User, "user");
        expect(exposedProps).toEqualMessy({
            create: ["name", "email", "birthDate", "dateCreated", "id", "creator"],
            update: ["name", "email", "birthDate", "dateCreated", "id", "creator"],
            list: ["country", "email", "birthDate", "dateCreated", "id", "creator"],
            details: ["email", "birthDate", "dateCreated", "id", "creator"],
            anotherCustom: ["country", "birthDate", "id", "creator"],
            customOperation: ["address", "birthDate", "id", "creator"],
        });
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
        expect(userProps).toEqualMessy({
            create: ["name", "id"],
            details: ["email", "id", "dateCreated"],
            list: ["name", "id", "dateCreated"],
            update: ["name", "id"],
        });

        const contactProps = getExposedProps(User, "contact");
        expect(contactProps).toEqualMessy({
            create: ["name", "id"],
            details: ["id", "dateCreated"],
            list: ["email", "id", "dateCreated"],
            update: ["name", "id"],
        });
    });

    it("should return all exposed props with custom group on another context", () => {
        class AbstractEntity {
            @TestGroups("all")
            id: number;

            @TestGroups(["list", "details"])
            dateCreated: Date;
        }

        class Contact extends AbstractEntity {
            @TestGroups(["customGroup"])
            firstName: string;

            @TestGroups({ user: ["details"], contact: "all" })
            lastName: string;
        }

        class User extends AbstractEntity {
            @TestGroups(["create", "update"])
            @TestGroups({ user: ["list"] })
            name: string;

            @TestGroups({ user: ["details"], contact: ["list"] })
            email: string;

            @TestGroups({ user: ["details", "customGroup"] })
            contact: Contact;
        }

        expect(getExposedProps(User, "user")).toEqualMessy({
            create: ["name", "id"],
            update: ["name", "id"],
            list: ["name", "dateCreated", "id"],
            details: ["email", "contact", "dateCreated", "id"],
            customGroup: ["contact", "id"],
        });
        expect(getExposedProps(User, "contact")).toEqualMessy({
            create: ["name", "id"],
            update: ["name", "id"],
            list: ["email", "dateCreated", "id"],
            details: ["dateCreated", "id"],
        });

        expect(getExposedProps(Contact, "user")).toEqualMessy({
            create: ["id"],
            update: ["id"],
            list: ["dateCreated", "id"],
            details: ["lastName", "dateCreated", "id"],
            customGroup: ["firstName", "id"],
        });
        expect(getExposedProps(Contact, "contact")).toEqualMessy({
            create: ["lastName", "id"],
            update: ["lastName", "id"],
            list: ["lastName", "dateCreated", "id"],
            details: ["lastName", "dateCreated", "id"],
            customGroup: ["firstName", "lastName", "id"],
        });
    });
});
