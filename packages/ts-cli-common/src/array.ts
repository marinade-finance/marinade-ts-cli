// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chunkArray(array: any[], chunkSize: number): any[][] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chunkedArray: any[] = []
  for (let i = 0; i < array.length; i += chunkSize)
    chunkedArray.push(array.slice(i, i + chunkSize))
  return chunkedArray
}
