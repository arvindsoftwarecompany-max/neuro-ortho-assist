import LeadClassification from './LeadClassification';

export default function HotLeads() {
  return (
    <LeadClassification
      defaultFilter="hot"
      title="Hot Leads"
      minimal
    />
  );
}
