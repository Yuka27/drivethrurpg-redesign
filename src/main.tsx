import { showConfigError } from './lib/config-error'
import { envProblem } from './lib/env'

// Check the build's variables before anything reads them: a bad deploy gets a
// clear error screen, never a blank page. The app loads only when they pass.
if (envProblem) showConfigError(envProblem)
else await import('./bootstrap')
