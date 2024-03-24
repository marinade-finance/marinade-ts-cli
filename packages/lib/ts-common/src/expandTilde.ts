import { homedir } from 'os'
import { join } from 'path'

export function expandTilde(filepath: string): string {
  const home = homedir()

  if (filepath.charCodeAt(0) === 126 /* ~ */) {
    if (filepath.charCodeAt(1) === 43 /* + */) {
      return join(process.cwd(), filepath.slice(2))
    }
    return home ? join(home, filepath.slice(1)) : filepath
  }

  return filepath
}
