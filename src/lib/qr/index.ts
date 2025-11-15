/**
 * QR Module Exports
 * Phase 1: MVP Foundations
 */

export {
  generateUpiQrCode,
  generateMerchantQrCode,
  buildUpiPaymentString,
  generateUpiQrCodeSvg,
} from "./qr-generator";

export {
  createQrScanner,
  isCameraAvailable,
  requestCameraPermission,
  type QRScanner,
} from "./qr-scanner";

export {
  parseUpiPaymentString,
  validateParsedPayment,
  type ParsedUpiPayment,
} from "./qr-parser";

