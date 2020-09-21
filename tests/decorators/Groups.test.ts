import {
    registerGroupsDecorator,
    getGroupsMetadata,
    GROUPS_METAKEY,
    formatGroupsMethodName,
    GroupsMetadata,
} from "@/index";
import { TestGroups } from "./TestGroups";

describe("@Groups", () => {
    it("can retrieve metadata with getGroupsMetadata", () => {
        class Entity {
            @TestGroups("all")
            thing: string;
        }

        const metadata = getGroupsMetadata(Entity);
        expect(metadata).toBeDefined();
        expect(metadata).toBeInstanceOf(GroupsMetadata);
    });

    it("can be registered with registerGroupsDecorator function", () => {
        class User {
            name: string;
        }
        const registerFn = registerGroupsDecorator({
            metaKey: "testingGroups",
            metaClass: GroupsMetadata,
            groups: ["all"],
        });

        registerFn(User, "name", undefined);

        const metadata = getGroupsMetadata(User.constructor, "testingGroups");
        expect(metadata).toBeDefined();
        expect(metadata).toBeInstanceOf(GroupsMetadata);
        expect(metadata.metaKey).toEqual("testingGroups");
        expect(metadata.decoratedProps).toContain("name");
    });

    it("can be registered using @Groups decorator", () => {
        class Person {
            @TestGroups("all")
            lastName: string;
        }

        const metadata = getGroupsMetadata(Person);
        expect(metadata).toBeDefined();
        expect(metadata).toBeInstanceOf(GroupsMetadata);
        expect(metadata.metaKey).toEqual(GROUPS_METAKEY);
        expect(metadata.decoratedProps).toContain("lastName");
    });

    it("can be registered on MethodDecorator with alias", () => {
        class Employee {
            firstName: string;
            lastName: string;

            @TestGroups("all", "fullname")
            getFullname() {
                return this.firstName + " " + this.lastName;
            }
        }

        const metadata = getGroupsMetadata(Employee);
        expect(metadata).toBeDefined();
        expect(metadata).toBeInstanceOf(GroupsMetadata);
        expect(metadata.metaKey).toEqual(GROUPS_METAKEY);
        const formated = formatGroupsMethodName("getFullname", "fullname");
        expect(metadata.decoratedProps).toContain(formated);
    });

    it("can be registered on MethodDecorator without alias", () => {
        class Employee2 {
            firstName: string;
            lastName: string;

            @TestGroups("all")
            getFullname() {
                return this.firstName + " " + this.lastName;
            }
        }

        const metadata = getGroupsMetadata(Employee2);
        expect(metadata.decoratedProps).toContain(formatGroupsMethodName("getFullname"));
    });

    it("can be registered on accessor (getter/setter) without alias", () => {
        class Employee3 {
            firstName: string;
            lastName: string;

            @TestGroups("all")
            get fullName() {
                return this.firstName + " " + this.lastName;
            }
        }

        const metadata = getGroupsMetadata(Employee3);
        expect(metadata.decoratedProps).toContain(formatGroupsMethodName("fullName", null, true));
    });

    it("can be registered on accessor (getter/setter) with alias", () => {
        class Employee4 {
            firstName: string;
            lastName: string;

            @TestGroups("all", "name")
            get fullName() {
                return this.firstName + " " + this.lastName;
            }
        }

        const metadata = getGroupsMetadata(Employee4);
        expect(metadata.decoratedProps).toContain(formatGroupsMethodName("fullName", "name", true));
    });
});
