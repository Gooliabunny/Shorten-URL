export default {
    testEnvironment: 'node',
    transform: {},
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    testMatch: ['**/*.test.js'],
    collectCoverageFrom: [
        'server.js',
        '!node_modules/**',
    ],
};