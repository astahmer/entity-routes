import { createIcon } from "@chakra-ui/react";

export const Arrow = (props) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 512 512" {...props}>
            <path d="M322.7,128.4L423,233.4c6,5.8,9,13.7,9,22.4c0,8.7-3,16.5-9,22.4L322.7,383.6c-11.9,12.5-31.3,12.5-43.2,0&#10;&#9;c-11.9-12.5-11.9-32.7,0-45.2l48.2-50.4h-217C93.7,288,80,273.7,80,256c0-17.7,13.7-32,30.6-32h217l-48.2-50.4&#10;&#9;c-11.9-12.5-11.9-32.7,0-45.2C291.4,115.9,310.7,115.9,322.7,128.4z" />
        </svg>
    );
};
export const ArrowEmpty = (props) => {
    return (
        <svg viewBox="0 0 556 412" version="1.1" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g id="Artboard" stroke="none" strokeWidth="1" fill="none" fill-rule="evenodd">
                <g id="right" transform="translate(26.000000, 39.000000)" fill="currentColor" fill-rule="nonzero">
                    <path
                        d="M547.242187,182.865346 C501.15175,136.144677 411.076312,76.9017147 357.268312,26.5674777 L340.91525,11.2728423 C333.865062,4.64476676 324.7605,0.992782388 315.334125,0.992782388 C294.3795,0.992782388 277.334125,18.2250584 277.334125,39.4094491 L277.332937,104.055956 L50.6670625,103.448666 C22.735875,103.448666 -3.49587026e-11,126.420632 -3.49587026e-11,154.670088 L-3.49587026e-11,257.114132 C-3.49587026e-11,285.363588 22.735875,308.336754 50.6670625,308.336754 L277.334125,308.944044 L277.334125,374.583333 C277.334125,395.767724 294.3795,413 315.334125,413 C324.7605,413 333.863875,409.348016 340.91525,402.71994 L357.268312,387.425305 C411.0775,337.091068 501.154125,276.854122 547.243375,230.121448 C552.882812,224.369753 556,215.991318 556,206.5 C556,197.008682 552.882812,188.630247 547.242187,182.865346 Z M488.023056,207.461055 C455.793099,236.358059 392.466677,288.72588 354.621174,320.023546 L343.092896,329.564833 C341.906666,330.547398 339.918454,331.716299 337.197744,331.716299 C332.279536,331.716299 328.267953,328.138504 328.267953,323.733797 L328.267953,259.876021 C328.267953,255.463831 324.27395,251.893519 319.338162,251.893519 L75.8587443,254.574399 C66.0047491,254.574399 58,247.410576 58,238.610142 L58,174.752367 C58,165.951933 66.0055862,158.78811 75.8587443,158.78811 L319.338999,156.10723 C324.274787,156.10723 328.26879,152.536917 328.26879,148.124727 L328.26879,84.2662032 C328.26879,79.8622445 332.280373,76.2837006 337.198581,76.2837006 C339.919291,76.2837006 341.907503,77.4533502 343.093733,78.4351673 L354.622011,87.9764542 C392.466677,119.27412 455.793099,171.641941 488.023056,200.531462 C488.511109,200.967742 489,202.215218 489,204 C489,205.784782 488.511109,207.032258 488.023056,207.461055 Z"
                        id="Shape"
                    ></path>
                </g>
            </g>
        </svg>
    );
};

export const CollapseRight = createIcon({
    displayName: "CollapseRight",
    viewBox: "0 0 5 8",
    d:
        "M0 0.724246C0 0.111374 0.681914 -0.223425 1.13107 0.168926L4.66916 3.25957C5.11028 3.6449 5.11028 4.3551 4.66916 4.74043L1.13107 7.83107C0.681913 8.22342 0 7.88863 0 7.27575V0.724246Z",
});

export const CollapseDown = createIcon({
    displayName: "CollapseDown",
    viewBox: "0 0 8 6",
    d:
        "M7.27575 0.5C7.88863 0.5 8.22342 1.18191 7.83107 1.63107L4.74043 5.16916C4.3551 5.61028 3.6449 5.61028 3.25957 5.16916L0.168926 1.63107C-0.223425 1.18191 0.111375 0.5 0.724247 0.5L7.27575 0.5Z",
});
