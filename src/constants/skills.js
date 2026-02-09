export const CATEGORIES = {
    MUSIC: 'Music',
    SPORTS: 'Sports',
    ACTING: 'Acting',
    DANCE: 'Dance',
    CIRCUS: 'Circus Arts',
    OTHER: 'Other'
};

export const SUBCATEGORIES = {
    [CATEGORIES.MUSIC]: [
        'Guitar', 'Piano', 'Vocals', 'Drums', 'Bass', 'Violin', 'Saxophone', 'Production', 'DJ', 'Other'
    ],
    [CATEGORIES.SPORTS]: [
        'Football', 'Basketball', 'Tennis', 'Swimming', 'Athletics', 'Martial Arts', 'Yoga', 'Fitness', 'Other'
    ],
    [CATEGORIES.ACTING]: [
        'Theatre', 'Film', 'Voice Acting', 'Improv', 'Stunt', 'Commercial', 'Other'
    ],
    [CATEGORIES.DANCE]: [
        'Ballet', 'Contemporary', 'Hip Hop', 'Jazz', 'Tap', 'Ballroom', 'Latin', 'Folk', 'Other'
    ],
    [CATEGORIES.CIRCUS]: [
        'Acrobatics', 'Juggling', 'Aerial', 'Clowning', 'Contortion', 'Balance', 'Fire', 'Magic', 'Other'
    ],
    [CATEGORIES.OTHER]: [
        'Other'
    ]
};

export const STYLES_SUGGESTIONS = {
    [CATEGORIES.MUSIC]: ['Rock', 'Pop', 'Latin', 'Funk', 'Classical', 'Jazz', 'Metal'],
    [CATEGORIES.ACTING]: ['Comedy', 'Drama', 'Still', 'Expressive', 'Improv', 'Method'],
    [CATEGORIES.SPORTS]: ['Street', 'Vert', 'Freestyle', 'Competitive', 'Recreational'],
    [CATEGORIES.DANCE]: ['Ballet', 'Contemporary', 'Hip Hop', 'Jazz', 'Tap', 'Ballroom'],
    [CATEGORIES.CIRCUS]: ['Acrobatics', 'Juggling', 'Aerial', 'Clowning']
};

export const SOURCES = ['Education', 'Self-taught'];

export const PRACTISING_FREQUENCIES = [
    'Every day',
    'Every second day',
    'Once a week',
    'Once in a while',
];

export const SKILL_LEVELS = ['Beginner', 'Experienced', 'Advanced', 'Pro'];

export const AVAILABILITY_OPTIONS = ['available', 'maybe', 'busy'];

export const MONTHS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
];

export const currentYear = new Date().getFullYear();
export const YEARS = Array.from({ length: 80 }, (_, i) => currentYear - i);
