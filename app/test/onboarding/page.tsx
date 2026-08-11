import OnboardingForm from "@/app/onboarding/form";

export default function TestOnboardingPage() {
  return (
    <OnboardingForm
      invite="test-only"
      memberId="test-onboarding-member"
      loginEmail="test@example.com"
      testMode
      communities={[
        { id: "11111111-1111-4111-8111-111111111111", name: "ManKind Project" },
        { id: "22222222-2222-4222-8222-222222222222", name: "Bărbați în Comuniune" },
        { id: "33333333-3333-4333-8333-333333333333", name: "Bărbați la Fain" },
      ]}
    />
  );
}
