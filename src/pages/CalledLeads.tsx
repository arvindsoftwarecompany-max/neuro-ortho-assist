import LeadClassification from './LeadClassification';

export default function CalledLeads() {
  return (
    <LeadClassification
      title="Called Leads"
      subtitle="Jin leads ko call ho chuka hai unki list"
      skipAnalysis
      minimal
      onlyCalled
    />
  );
}
