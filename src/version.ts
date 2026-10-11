export const GAME_VERSION = __GAME_VERSION__;
export const GAME_BUILD = `prototype-${GAME_VERSION}`;
/** Short commit the build came from; the hosted build stamps it from the deploy, a local one from git. */
export const SOURCE_REVISION = typeof __SOURCE_REVISION__ === 'string' ? __SOURCE_REVISION__ : 'dev';
/** What the title and pause screens print, so a tester can match the build against main at a glance. */
export const BUILD_LABEL = `${GAME_VERSION} · ${SOURCE_REVISION}`;
