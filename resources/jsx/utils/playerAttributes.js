export const DETAIL_GROUPS = [
    {
        key: 'pace',
        label: 'PACE',
        icon: 'fa-gauge-high',
        fields: [
            ['acceleration', 'Acceleration'],
            ['sprint_speed', 'Sprint Speed'],
        ],
    },
    {
        key: 'shooting',
        label: 'SHOOTING',
        icon: 'fa-bullseye',
        fields: [
            ['positioning', 'Positioning'],
            ['finishing', 'Finishing'],
            ['shot_power', 'Shot Power'],
            ['long_shots', 'Long Shots'],
            ['volleys', 'Volleys'],
            ['penalties', 'Penalties'],
        ],
    },
    {
        key: 'passing',
        label: 'PASSING',
        icon: 'fa-diagram-project',
        fields: [
            ['vision', 'Vision'],
            ['crossing', 'Crossing'],
            ['free_kick_accuracy', 'Free Kick Accuracy'],
            ['short_passing', 'Short Passing'],
            ['long_passing', 'Long Passing'],
            ['curve', 'Curve'],
        ],
    },
    {
        key: 'dribbling',
        label: 'DRIBBLING',
        icon: 'fa-wand-magic-sparkles',
        fields: [
            ['agility', 'Agility'],
            ['balance', 'Balance'],
            ['reactions', 'Reactions'],
            ['ball_control', 'Ball Control'],
            ['dribbling', 'Dribbling'],
            ['composure', 'Composure'],
        ],
    },
    {
        key: 'defending',
        label: 'DEFENDING',
        icon: 'fa-shield-halved',
        fields: [
            ['interceptions', 'Interceptions'],
            ['heading_accuracy', 'Heading Accuracy'],
            ['def_awareness', 'Def Awareness'],
            ['standing_tackle', 'Standing Tackle'],
            ['sliding_tackle', 'Sliding Tackle'],
        ],
    },
    {
        key: 'physicality',
        label: 'PHYSICALITY',
        icon: 'fa-dumbbell',
        fields: [
            ['jumping', 'Jumping'],
            ['stamina', 'Stamina'],
            ['strength', 'Strength'],
            ['aggression', 'Aggression'],
        ],
    },
];

export const GK_DETAIL_GROUP = {
    key: 'goalkeeping',
    label: 'GOALKEEPING',
    icon: 'fa-hand',
    fields: [
        ['gk_diving', 'GK Diving'],
        ['gk_handling', 'GK Handling'],
        ['gk_kicking', 'GK Kicking'],
        ['gk_positioning', 'GK Positioning'],
        ['gk_reflexes', 'GK Reflexes'],
    ],
};

export const DETAIL_KEYS = [
    ...DETAIL_GROUPS.flatMap((group) => group.fields.map(([key]) => key)),
    ...GK_DETAIL_GROUP.fields.map(([key]) => key),
];

const clamp = (value) => Math.max(30, Math.min(99, Math.round(value)));

const numeric = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

export function deriveDetailedStats(source = {}) {
    const stat = (key, fallback) => numeric(source[key]) ?? fallback;

    const pac = stat('pac', 80);
    const sho = stat('sho', 80);
    const pas = stat('pas', 80);
    const dri = stat('dri', 80);
    const def = stat('def', 50);
    const phy = stat('phy', 70);

    return {
        acceleration: clamp(pac + 1),
        sprint_speed: clamp(pac),
        positioning: clamp(sho - 1),
        finishing: clamp(sho),
        shot_power: clamp(sho + 1),
        long_shots: clamp(sho - 2),
        volleys: clamp(sho - 3),
        penalties: clamp(sho - 2),
        vision: clamp(pas + 1),
        crossing: clamp(pas - 1),
        free_kick_accuracy: clamp(pas - 2),
        short_passing: clamp(pas + 1),
        long_passing: clamp(pas),
        curve: clamp(pas - 1),
        agility: clamp(dri + 1),
        balance: clamp(dri),
        reactions: clamp(dri),
        ball_control: clamp(dri + 1),
        dribbling: clamp(dri),
        composure: clamp(dri),
        interceptions: clamp(def + 1),
        heading_accuracy: clamp(def - 2),
        def_awareness: clamp(def + 1),
        standing_tackle: clamp(def),
        sliding_tackle: clamp(def - 1),
        jumping: clamp(phy),
        stamina: clamp(phy + 1),
        strength: clamp(phy),
        aggression: clamp(phy - 1),
        gk_diving: clamp(stat('div', 75)),
        gk_handling: clamp(stat('han', 75)),
        gk_kicking: clamp(stat('kic', 70)),
        gk_positioning: clamp(stat('pos', 75)),
        gk_reflexes: clamp(stat('ref', 78)),
    };
}

export function detailedStatsOf(source = {}) {
    const derived = deriveDetailedStats(source);

    for (const key of DETAIL_KEYS) {
        const value = numeric(source[key]);
        if (value !== null) derived[key] = clamp(value);
    }

    return derived;
}
