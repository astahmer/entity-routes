const base = (isRoot) => ({
    skip: {
        changelog: false,
        bump: true,
        commit: true,
        tag: true,
    },
    types: [
        { type: "feat", section: "Features" },
        { type: "fix", section: "Bug Fixes" },
        { type: "docs", section: "Documentation" },
        { type: "perf", section: "Performance" },
        { type: "refactor", section: "Refactoring", hidden: !isRoot },
        { type: "build", section: "Build", hidden: !isRoot },
        { type: "deps", section: "Dependencies", hidden: !isRoot },
        { type: "chore", section: "Misc", hidden: !isRoot },
        { type: "style", section: "Code style", hidden: !isRoot },
        { type: "prettier", section: "Prettier", hidden: !isRoot },
        { type: "test", section: "Tests", hidden: !isRoot },
    ],
});

module.exports = {
    ...base(true),
    scoped: (pkgDir) => {
        // Only collect changes from package calling standard-version

        return {
            ...base(),
            path: pkgDir,
        };
    },
};
