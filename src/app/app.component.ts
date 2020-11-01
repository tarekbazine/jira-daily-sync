import { Component, NgZone, OnInit } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  datesBounds,
  groupIssues,
  STATUS,
  structureHistory,
  transformHistoryChange,
  transformIssues,
} from './fn';
import { DailySyncModel, IssueModel } from './models';

declare let AP: AtlassianConnect;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  public URL = 'https://thinkers-dz.atlassian.net/browse/'; // todo get dynamically ?

  public rawIssuesResult$ = new BehaviorSubject({ empty: true });
  public issues$ = new BehaviorSubject<IssueModel[]>([]);

  // tslint:disable-next-line:variable-name
  public _dailySync$ = new BehaviorSubject<DailySyncModel>({});
  public dailySync$ = this._dailySync$.pipe(
    switchMap((value) => {
      // console.log(value);
      return this.setForIssue(value);
    }),
    map((value) => {
      return structureHistory(JSON.parse(JSON.stringify(value)));
    })
  );

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.init();
  }

  private init(): void {
    const dates = datesBounds();

    const jqlDates = `UPDATED >= ${dates.begins} AND UPDATED <= ${dates.ends}`;

    const jqlStatus = `STATUS in (${STATUS.map((value) => {
      if (value.includes(' ')) {
        return '"' + value + '"';
      }
      return value;
    }).join(',')})`;

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

export interface AtlassianConnect {
  request: (_: any) => any;
}
