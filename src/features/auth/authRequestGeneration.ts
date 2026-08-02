export function isCurrentAuthRequest(
  requestGeneration: number,
  currentGeneration: number,
): boolean {
  return requestGeneration === currentGeneration;
}
