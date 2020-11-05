import { Component, NgZone, OnInit } from '@angular/core';
import { BehaviorSubject, forkJoin, interval, Observable } from 'rxjs';
import { debounce, map, switchMap } from 'rxjs/operators';
import {
  datesBounds,
  formatDate,
  groupIssues,
  structureHistory,
  transformHistoryChange,
  transformIssues,
} from './fn';
import { DailySyncModel, IssueModel, SettingsModel } from './models';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { FormControl, FormGroup } from '@angular/forms';
import * as moment from 'moment';

declare let AP: AtlassianConnect;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  public URL = 'https://estateos.atlassian.net/browse/'; // todo get dynamically ?

  public rawIssuesResult$ = new BehaviorSubject({ empty: true });
  public issues$ = new BehaviorSubject<IssueModel[]>([]);
  public settings$ = new BehaviorSubject<SettingsModel>(null);

  // tslint:disable-next-line:variable-name
  public _dailySync$ = new BehaviorSubject<DailySyncModel>({});
  public dailySync$ = this._dailySync$.pipe(
    switchMap((value) => {
      // console.log(value);
      return this.setForIssue(value);
    }),
    map((value) => {
      return structureHistory(
        JSON.parse(JSON.stringify(value)),
        this.settings$.getValue()
      );
    })
  );

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  readonly dates = datesBounds();
  dateRange = new FormGroup({
    start: new FormControl(this.dates.begins),
    end: new FormControl(this.dates.ends),
  });
  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.dateRange.valueChanges
      .pipe(debounce(() => interval(500)))
      .subscribe((value) => {
        if (value.start && value.end) {
          this.settings$.next({
            ...this.settings$.getValue(),
            startRangeDate: formatDate(moment(value.start)),
            endRangeDate: formatDate(moment(value.end)),
          });
        }
      });

    this.initListner();

    // todo
    // "baseUrl": "https://jira-daily-sync.netlify.app",
    this.settings$.next({
      startRangeDate: this.dates.begins,
      endRangeDate: this.dates.ends,
      // status: ['Planned For Today', 'In Progress', 'In Code Review'],
      status: ['In Progress', 'Done'],
    });
  }

  private initListner(): void {
    this.settings$.subscribe((settings) => {
      if (!settings) {
        return;
      }

      const jqlDates = `UPDATED >= ${settings.startRangeDate} AND UPDATED <= ${settings.endRangeDate}`;

      const jqlStatus = `STATUS in (${settings.status
        .map((value) => {
          if (value.includes(' ')) {
            return '"' + value + '"';
          }
          return value;
        })
        .join(',')})`;

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

  public addStatusChips(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;

    // Add our fruit
    if ((value || '').trim()) {
      this.settings$.next({
        ...this.settings$.getValue(),
        status: [...this.settings$.getValue().status, value],
      });
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }
  }

  public removeStatusChips(status: string): void {
    const index = this.settings$.getValue().status.indexOf(status);

    if (index >= 0) {
      this.settings$.next({
        ...this.settings$.getValue(),
        status: [
          ...this.settings$
            .getValue()
            .status.slice(0, index)
            .concat(
              this.settings$
                .getValue()
                .status.slice(
                  index + 1,
                  this.settings$.getValue().status.length
                )
            ),
        ],
      });
    }
  }
}

export interface AtlassianConnect {
  request: (_: any) => any;
}
