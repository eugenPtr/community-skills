import OnboardingForm from "@/app/onboarding/form";

export default function TestOnboardingPage() {
  return (
    <OnboardingForm
      invite="test-only"
      memberId="test-onboarding-member"
      loginEmail="test@example.com"
      testMode
    />
  );
}
