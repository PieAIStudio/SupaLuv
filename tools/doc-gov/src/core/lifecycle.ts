export const normalStatuses = [
  'draft',
  'active',
  'completed',
  'stable',
  'superseded',
  'archived',
] as const;

export const decisionStatuses = ['proposed', 'accepted', 'rejected', 'superseded'] as const;

export type NormalStatus = (typeof normalStatuses)[number];
export type DecisionStatus = (typeof decisionStatuses)[number];

export function isTerminalStatus(status: string) {
  return status === 'archived' || status === 'superseded' || status === 'rejected';
}

export function isCompletedStatus(status: string) {
  return status === 'completed';
}
