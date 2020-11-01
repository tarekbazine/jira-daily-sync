
export interface DailySyncModel {
  [date: string]: UserDailySyncModel;
}

export interface UserDailySyncModel {
  [assigneeAccountId: string]: IssueModel[];
  date: any; // string
}

export interface IssueModel {
  id: string;
  key: string;
  type: string; // fields.issuetype.name
  url: string; // self
  status: string; // fields.status.name
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

