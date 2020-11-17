import { AbstractFilter, AbstractFilterApplyArgs, registerFilterDecorator } from "@/index";

export function GroupBy(): PropertyDecorator;
export function GroupBy(props: string[]): ClassDecorator;
export function GroupBy(props?: string[]): PropertyDecorator | ClassDecorator {
    return (target: object | Function, propName?: string) => {
        // If propName is defined => PropertyDecorator, else it's a ClassDecorator
        const isPropDecorator = !!propName;
        target = isPropDecorator ? target.constructor : target;

        const defaultConfig = { class: GroupByFilter, options: {} };
        const properties = props || [propName];

        registerFilterDecorator({
            target,
            defaultConfig,
            properties,
        });
    };
}

export class GroupByFilter extends AbstractFilter {
    apply({ qb }: Pick<AbstractFilterApplyArgs, "qb">) {
        this.filterProperties.forEach((prop) => {
            qb.addGroupBy(prop);
        });
    }
}
