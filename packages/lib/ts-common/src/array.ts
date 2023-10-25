export function chunkArray<T>(array: T[], size: number): T[][] {
  return [...new Array(Math.ceil(array.length / size)).keys()].map((_, index) =>
    array.slice(index * size, (index + 1) * size)
  )
}

export async function batchFetch<A, T>(
  addresses: Array<A>,
  fetchBatch: (chunk: Array<A>) => Promise<Array<T>>,
  chunkSize = 100 // limit for web3 client getMultipleAccounts fetch
): Promise<Array<T>> {
  const results: Array<Array<T>> = await Promise.all(
    chunkArray(addresses, chunkSize).map(chunk => fetchBatch(chunk))
  )
  return results.reduce((acc, curr) => acc.concat(...curr), new Array<T>())
}
