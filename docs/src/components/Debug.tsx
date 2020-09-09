export function Debug({ json }) {
    return <pre>{JSON.stringify(json || {}, null, 4)}</pre>;
}
