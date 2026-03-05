import { env } from "@/lib/env";
import type { BandAvailability } from "@/lib/integrations/types";

export type BandReadiness = {
  availability: BandAvailability;
  availabilityMessage: string;
  readyForOAuth: boolean;
  missingCredentials: string[];
};

const BAND_REVIEW_PENDING_MESSAGE =
  "BAND 앱 키 발급 심사 중입니다. 심사 완료 후 BAND 연결 기능이 자동으로 활성화됩니다.";

const BAND_MISSING_CREDENTIALS_MESSAGE =
  "BAND 심사는 완료되었지만 운영 키 설정이 아직 끝나지 않았습니다. 관리자에게 BAND Client ID/Secret 설정을 요청하세요.";

function getMissingBandCredentials() {
  const missing: string[] = [];
  if (!env.BAND_CLIENT_ID) {
    missing.push("BAND_CLIENT_ID");
  }

  if (!env.BAND_CLIENT_SECRET) {
    missing.push("BAND_CLIENT_SECRET");
  }

  return missing;
}

export function getBandReadiness(): BandReadiness {
  const missingCredentials = getMissingBandCredentials();
  const reviewApproved = env.BAND_APP_REVIEW_STATUS === "AVAILABLE";

  if (!reviewApproved) {
    return {
      availability: "PENDING_REVIEW",
      availabilityMessage: env.BAND_REVIEW_MESSAGE_KO || BAND_REVIEW_PENDING_MESSAGE,
      readyForOAuth: false,
      missingCredentials
    };
  }

  if (missingCredentials.length > 0) {
    return {
      availability: "PENDING_REVIEW",
      availabilityMessage: BAND_MISSING_CREDENTIALS_MESSAGE,
      readyForOAuth: false,
      missingCredentials
    };
  }

  return {
    availability: "AVAILABLE",
    availabilityMessage: "BAND 연동을 사용할 준비가 완료되었습니다.",
    readyForOAuth: true,
    missingCredentials
  };
}
