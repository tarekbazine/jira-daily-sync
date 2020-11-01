import * as moment from 'moment';
import {
  DailySyncModel,
  IssueModel,
  StatusHistoryChangeModel,
  UserDailySyncModel,
} from './models';

moment.locale('en', {
  week: {
    dow: 1, // Monday is the first day of the week.
  },
});

export function formatDate(m: moment.Moment): string {
  return m.format('YYYY-MM-DD');
}

export function transformIssues(rawIssues: []): IssueModel[] {
  return rawIssues.map<IssueModel>((issue: any) => {
    return {
      id: issue.id,
      key: issue.key,
      type: issue.fields.issuetype.name,
      url: issue.self,
      status: issue.fields.status.name,
      project: issue.fields.project.name,
      assigneeAccountId: issue.fields.assignee?.accountId,
      assigneeDisplayName: issue.fields.assignee?.displayName,
      updated: issue.fields.updated,
      updatedDate: formatDate(moment(issue.fields.updated)),
    };
  });
}

export function groupIssues(issues: IssueModel[]): DailySyncModel {
  const groupByDates = issues.reduce<GroupIssuesByDate>(
    (previousValue: GroupIssuesByDate, issue: IssueModel) => {
      previousValue[issue.updatedDate] = previousValue[issue.updatedDate] || [];

      previousValue[issue.updatedDate].push(issue);
      return previousValue;
    },
    {} as GroupIssuesByDate
  );

  const dailySyncModel: DailySyncModel = {};

  Object.entries(groupByDates).forEach(([key, value]) => {
    dailySyncModel[key] = value.reduce<UserDailySyncModel>(
      (previousValue: UserDailySyncModel, issue: IssueModel) => {
        previousValue[issue.assigneeAccountId] =
          previousValue[issue.assigneeAccountId] || [];

        previousValue[issue.assigneeAccountId].push(issue);
        previousValue.date = key;
        return previousValue;
      },
      {} as UserDailySyncModel
    );
    dailySyncModel[key].date = key;
  });

  return dailySyncModel;
}

export function transformHistoryChange(res: any): StatusHistoryChangeModel[] {
  return res.values
    .filter(
      (change) => change.items[change.items.length - 1].fieldId === 'status'
    )
    .map((change) => {
      const x = change.items[change.items.length - 1];
      return {
        at: change.created,
        fromId: x.from,
        fromString: x.fromString,
        toId: x.to,
        _toString: x.toString,
      } as StatusHistoryChangeModel;
    });
}

export function structureHistory(
  dailySyncModel: DailySyncModel
): DailySyncModel {
  // todo um-mutable

  const dates = datesBounds();
  const begins = moment(dates.begins);
  const ends = moment(dates.ends);

  Object.entries(dailySyncModel).forEach(([key, value]) => {
    Object.entries(value).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((issue) => {
          issue.changelog.forEach((change) => {
            const date = moment(change.at);
            const dateFormatted = formatDate(date);

            if (date.isBetween(begins, ends, 'day', '[]')) {
              dailySyncModel[dateFormatted] =
                dailySyncModel[dateFormatted] || ({} as UserDailySyncModel);

              dailySyncModel[dateFormatted][issue.assigneeAccountId] =
                dailySyncModel[dateFormatted][issue.assigneeAccountId] || [];

              const clone = { ...issue, statusFromHistory: change._toString };
              dailySyncModel[dateFormatted][issue.assigneeAccountId].push(
                clone
              );
            }
          });
        });
      }
    });
  });

  return dailySyncModel;
}

export function datesBounds(): { begins: string; ends: string } {
  // console.log(moment().endOf('week'));

  return {
    begins: formatDate(moment().startOf('week')),
    ends: formatDate(moment().weekday(7)),
  };
}

// ----

export interface GroupIssuesByDate {
  [date: string]: IssueModel[];
  // date: any; // string
}
