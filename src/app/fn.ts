import * as moment from 'moment';
import {
  DailySyncModel,
  IssueModel,
  SettingsModel,
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
      typeIconUrl: issue.fields.issuetype.iconUrl,
      summary: issue.fields.summary,
      url: issue.self,
      status: issue.fields.status.name,
      priority: issue.fields.priority.name,
      priorityIconUrl: issue.fields.priority.iconUrl,
      project: issue.fields.project.name,
      assigneeAccountId: issue.fields.assignee?.accountId,
      assigneeDisplayName: issue.fields.assignee?.displayName,
      updated: issue.fields.updated,
      timespent: issue.fields.timespent,
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
        // previousValue.date = key;
        return previousValue;
      },
      {} as UserDailySyncModel
    );
    // dailySyncModel[key].date = key;
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
  dailySyncModel: DailySyncModel,
  settings: SettingsModel
): DailySyncModel {
  // todo um-mutable

  const dates = datesBounds();
  const begins = moment(dates.begins);
  const ends = moment(dates.ends);

  Object.entries(dailySyncModel).forEach(([key, value]) => {
    Object.entries(value).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((issue) => {
          // Object.freeze(issue);

          issue.changelogPerDay = {};
          issue.changelog.forEach((change) => {
            const date = moment(change.at);
            const dateFormatted = formatDate(date);

            // debugger;
            if (
              date.isBetween(begins, ends, 'day', '[]') &&
              settings.status.map(s => s.toLocaleLowerCase().trim()).includes(change._toString.toLocaleLowerCase().trim())
            ) {
              issue.changelogPerDay[dateFormatted] =
                issue.changelogPerDay[dateFormatted] || [];
              issue.changelogPerDay[dateFormatted].push(change._toString);

              if (change._toString !== issue.status) {
                dailySyncModel[dateFormatted] =
                  dailySyncModel[dateFormatted] || ({} as UserDailySyncModel);

                dailySyncModel[dateFormatted][issue.assigneeAccountId] =
                  dailySyncModel[dateFormatted][issue.assigneeAccountId] || [];

                const index = dailySyncModel[dateFormatted][
                  issue.assigneeAccountId
                ].findIndex((o) => o.id === issue.id);

                if (index === -1) {
                  const clone = {
                    ...issue,
                    statusFromHistory: change._toString,
                  };

                  dailySyncModel[dateFormatted][issue.assigneeAccountId].push(
                    clone
                  );
                }
              }
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
    ends: formatDate(moment().endOf('week')),
    // ends: formatDate(moment().weekday(7)),
  };
}

// ----

export interface GroupIssuesByDate {
  [date: string]: IssueModel[];
  // date: any; // string
}
