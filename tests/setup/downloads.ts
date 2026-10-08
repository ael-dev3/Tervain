import { DOWNLOAD_POLICY } from '../../src/presentation/assets/download';

// Retries keep their count under test, without the real pauses between tries.
DOWNLOAD_POLICY.backoffMs = [0, 0];
