export interface DailySyncModel {
  [date: string]: UserDailySyncModel;
}

export interface UserDailySyncModel {
  [assigneeAccountId: string]: IssueModel[];
  // date: any; // string
}

export interface IssueModel {
  id: string;
  key: string;
  summary: string; // fields.summary
  type: string; // fields.issuetype.name
  typeIconUrl: string; // fields.issuetype.iconUrl
  url: string; // self
  status: string; // fields.status.name
  priority: string; // fields.priority.name
  priorityIconUrl: string; // fields.priority.iconUrl
  project: string; // fields.project.name
  assigneeAccountId: string; // fields.assignee.accountId
  assigneeDisplayName: string; // fields.assignee.displayName
  // updated: string; // fields.updated
  updatedDate: string; // fields.updated
  // ------ calculated -------
  changelog?: StatusHistoryChangeModel[]; // extra info
  statusFromHistory?: string;
}

export interface StatusHistoryChangeModel {
  at: string;
  fromString: string;
  fromId: string;
  _toString: string;
  toId: string;
}

export interface SettingsModel {
  startRangeDate: string;
  endRangeDate: string;
  status: string[];
}
