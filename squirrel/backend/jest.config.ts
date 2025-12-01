import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  passWithNoTests: true,
  moduleNameMapper: pathsToModuleNameMapper(
    {
      '@app/*': ['*'],
      '@modules/*': ['modules/*'],
      '@common/*': ['common/*'],
      '@infra/*': ['infra/*'],
      '@domain/*': ['domain/*'],
      '@events/*': ['events/*'],
      '@services/*': ['services/*'],
    },
    {
      prefix: '<rootDir>/',
    },
  ),
};

export default config;
