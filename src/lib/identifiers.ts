import { randomInt } from "node:crypto";

const referenceAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateAccountNumber(): string {
  let accountNumber = "";

  for (let index = 0; index < 10; index += 1) {
    accountNumber += randomInt(0, 10).toString();
  }

  return accountNumber;
}

export function generateTransactionReference(date = new Date()): string {
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  let suffix = "";

  for (let index = 0; index < 6; index += 1) {
    suffix += referenceAlphabet[randomInt(0, referenceAlphabet.length)];
  }

  return `TX-${datePart}-${suffix}`;
}