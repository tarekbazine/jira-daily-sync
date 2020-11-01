import { Component, NgZone, OnInit } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import * as moment from 'moment';
import { switchMap } from 'rxjs/operators';

declare let AP: AtlassianConnect;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'jira-daily-sync';

  public rawIssuesResult$ = new BehaviorSubject({ empty: true });
  public issues$ = new BehaviorSubject<IssueModel[]>([]);

  // tslint:disable-next-line:variable-name
  public _dailySync$ = new BehaviorSubject<DailySyncModel>({});
  public dailySync$ = this._dailySync$.pipe(
    switchMap((value) => {
      // console.log(value);
      return this.setForIssue(value);
    })
  );

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.init();
  }

  private init(): void {
    const jqlDates = `UPDATED >= ${formatDate(
      moment().startOf('week')
    )} AND UPDATED <= ${formatDate(moment().weekday(7))}`;

    const jqlStatus = `STATUS in (Done, "In Progress")`;

    // console.log(moment().endOf('week'));

    const jQL = jqlDates + ' AND ' + jqlStatus;
    console.log(jQL);

    AP.request({
      url: '/rest/api/3/search',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        jql: jQL,

        // todo dynamic
        maxResults: 150,

        fieldsByKeys: false,
        fields: ['*all'],
        // fields: ['summary', 'status', 'assignee'],
        startAt: 0,
      }),
      success: (responseText) => {
        this.ngZone.run(() => {
          this.rawIssuesResult$.next(JSON.parse(responseText));
          this.issues$.next(transformIssues(JSON.parse(responseText).issues));

          this._dailySync$.next(
            groupIssues(transformIssues(JSON.parse(responseText).issues))
          );
        });
      },
      error: (xhr, statusText, errorThrown) => {
        console.error(arguments);
      },
    });
  }

  private setForIssue(
    dailySyncModel: DailySyncModel
  ): Observable<DailySyncModel> {
    return Observable.create((observer) => {
      const obs = [];

      Object.entries(dailySyncModel).forEach(([key, value]) => {
        Object.entries(value).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            v.forEach((issue) => {
              obs.push(this.setIssuesChangeLog(issue));
            });
          }
        });
      });

      forkJoin(obs).subscribe((value) => {
        console.log(dailySyncModel);
        observer.next(dailySyncModel);
        observer.complete();
      });
    });
  }

  private setIssuesChangeLog(issueModel: IssueModel): Observable<IssueModel> {
    return Observable.create((observer) => {
      AP.request({
        url: `/rest/api/3/issue/${issueModel.id}/changelog`,
        success: (responseText) => {
          this.ngZone.run(() => {
            issueModel.changelog = transformHistoryChange(
              JSON.parse(responseText)
            );

            console.log(issueModel);

            observer.next(issueModel);
            observer.complete();
          });
        },
        error: (xhr, statusText, errorThrown) => {
          console.error(arguments);
        },
      });
    });
  }
}

function formatDate(m: moment.Moment): string {
  return m.format('YYYY-MM-DD');
}

function transformIssues(rawIssues: []): IssueModel[] {
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

function groupIssues(issues: IssueModel[]): DailySyncModel {
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

function transformHistoryChange(res: any): StatusHistoryChangeModel[] {
  return res.values
    .filter((change) => change.items[0].fieldId === 'status')
    .map((change) => {
      return {
        at: change.created,
        fromId: change.items[0].from,
        fromString: change.items[0].fromString,
        toId: change.items[0].to,
        _toString: change.items[0].toString,
      } as StatusHistoryChangeModel;
    });
}

interface DailySyncModel {
  [date: string]: UserDailySyncModel;
}

interface GroupIssuesByDate {
  [date: string]: IssueModel[];
  // date: any; // string
}

interface UserDailySyncModel {
  [assigneeAccountId: string]: IssueModel[];
  date: any; // string
}

interface IssueModel {
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
}

interface StatusHistoryChangeModel {
  at: string;
  fromString: string;
  fromId: string;
  _toString: string;
  toId: string;
}

// ----

interface AtlassianConnect {
  request: (_: any) => any;
}
