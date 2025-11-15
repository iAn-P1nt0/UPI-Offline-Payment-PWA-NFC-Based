/**
 * NFC Module Exports
 * Phase 1: MVP Foundations
 */

export {
  isNfcSupported,
  isNfcAvailable,
  requestNfcPermission,
  readNfcTag,
  writeNfcTag,
  generateNfcSignature,
  verifyNfcSignature,
  type NFCTagData,
} from "./nfc-manager";

export {
  formatNfcDataForDisplay,
  extractMerchantInfo,
  validateNfcPaymentAmount,
  createNfcPaymentData,
  createNfcMerchantData,
} from "./nfc-helpers";

