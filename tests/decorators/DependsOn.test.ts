import { DependsOn, getDependsOnMetadata } from "@/index";

describe("@DependsOn", () => {
    it("can retrieve metadata with getDependsOnMetadata", () => {
        class User {
            id: number;
            name: string;

            @DependsOn(["id", "name"])
            getIdentifier() {
                return `${this.id}_${this.name}`;
            }
        }

        const metadata = getDependsOnMetadata(User);
        expect(metadata).toEqual({
            getIdentifier: ["id", "name"],
        });
    });
});
