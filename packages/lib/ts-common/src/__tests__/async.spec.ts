import { doWithLock, waitFor } from '../async'

/**
 * Coming from https://gist.github.com/Justin-Credible/693529fa4672a0d97963b95a26897812#file-async-utils-ts
 */

describe('async-utils', () => {
  describe('doWithLock', () => {
    it('prevents multiple tasks from completing out of order', async () => {
      const completed: string[] = []

      await doWithLock('MY_LOCK', async () => {
        await waitFor(0)
        completed.push('A')
      })

      await doWithLock('MY_LOCK', async () => {
        await waitFor(250)
        completed.push('B')
      })

      await doWithLock('MY_LOCK', async () => {
        await waitFor(0)
        completed.push('C')
      })

      expect(completed).toEqual(['A', 'B', 'C'])
    })

    it('returns the expected results', async () => {
      const completed: string[] = []

      const promise1 = doWithLock('MY_LOCK', async () => {
        await waitFor(0)
        completed.push('A')
        return 'A'
      })

      const promise2 = doWithLock('MY_LOCK', async () => {
        await waitFor(250)
        completed.push('B')
        return 'B'
      })

      const promise3 = doWithLock('MY_LOCK', async () => {
        await waitFor(0)
        completed.push('C')
        return 'C'
      })

      const result1 = await promise1
      const result2 = await promise2
      const result3 = await promise3

      expect(result1).toEqual('A')
      expect(result2).toEqual('B')
      expect(result3).toEqual('C')
      expect(completed).toEqual(['A', 'B', 'C'])
    })

    it('continues to execute tasks, even if an error occurs', async () => {
      const completed: string[] = []

      const promise1 = doWithLock('MY_LOCK', async () => {
        await waitFor(0)
        completed.push('A')
        return 'A'
      })

      const promise2 = doWithLock('MY_LOCK', async () => {
        await waitFor(250)
        completed.push('B')
        throw new Error('ERR1')
      })

      const promise3 = doWithLock('MY_LOCK', async () => {
        await waitFor(0)
        completed.push('C')
        return 'C'
      })

      const result1 = await promise1
      let result2

      try {
        result2 = await promise2
      } catch (error) {
        result2 = error
      }

      const result3 = await promise3

      expect(result1).toEqual('A')
      expect(result2).toEqual(new Error('ERR1'))
      expect(result3).toEqual('C')
      expect(completed).toEqual(['A', 'B', 'C'])
    })

    it('can handle executing two different sets of tasks', async () => {
      const completedSet1: string[] = []
      const completedSet2: string[] = []

      const promise1 = doWithLock('MY_LOCK_1', async () => {
        await waitFor(0)
        completedSet1.push('A')
        return 'A'
      })

      const promise2 = doWithLock('MY_LOCK_1', async () => {
        await waitFor(250)
        completedSet1.push('B')
        return 'B'
      })

      const promise3 = doWithLock('MY_LOCK_1', async () => {
        await waitFor(0)
        completedSet1.push('C')
        return 'C'
      })

      const promise4 = doWithLock('MY_LOCK_2', async () => {
        await waitFor(0)
        completedSet2.push('X')
        return 'X'
      })

      const promise5 = doWithLock('MY_LOCK_2', async () => {
        await waitFor(250)
        completedSet2.push('Y')
        return 'Y'
      })

      const promise6 = doWithLock('MY_LOCK_2', async () => {
        await waitFor(0)
        completedSet2.push('Z')
        return 'Z'
      })

      const result1 = await promise1
      const result2 = await promise2
      const result3 = await promise3
      const result4 = await promise4
      const result5 = await promise5
      const result6 = await promise6

      expect(result1).toEqual('A')
      expect(result2).toEqual('B')
      expect(result3).toEqual('C')
      expect(result4).toEqual('X')
      expect(result5).toEqual('Y')
      expect(result6).toEqual('Z')
      expect(completedSet1).toEqual(['A', 'B', 'C'])
      expect(completedSet2).toEqual(['X', 'Y', 'Z'])
    })
  })
})
