export const PIN_LENGTH = 8

export const PIN_DIGITS_REGEX = /^\d{8}$/

export function isCompletePin(pin: string): boolean {
  return pin.length === PIN_LENGTH
}
