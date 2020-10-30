import {Component, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit{
  title = 'jira-daily-sync';

  public result$ = new BehaviorSubject(null);

  public result = { empty : true};

  ngOnInit(): void {

    this.result$.pipe(map(value => {
        console.log(value);
        this.result = value;
        return value;
      })
      );


    // @ts-ignore
    // window.AP.user.getCurrentUser((user) => {
    //   this.user$.next(user);
    //   console.log("The Atlassian Account ID is", user.atlassianAccountId);
    // });


    // @ts-ignore
    window.AP.request({
      url : '/rest/api/3/search',
      type: 'POST',
      data: {name: 'some text', description: 'test'},
      success: (responseText) => {
        this.result$.next(responseText);
        console.log(responseText);
      }
    });
  }

  click() {
    // @ts-ignore
    window.AP.jira.openCreateIssueDialog((issues) => {
      alert(issues[0]['fields']['summary']);
    }, {
      pid: 10000,
      issueType: 1,
      fields : {
        summary: "Hello World",
        environment : "My environment",
        priority : 2,
        assignee: "tom",
        reporter: "bob",
        labels : ["Mylabel","MyOtherLabel"],
        description : "My first Issue",
        duedate : "11/Oct/16",
        fixVersions : 10001,
        versions : 10000,
        components : "My component",
        timetracking_originalestimate: "2w",
        timetracking_remainingestimate: "3d",
        worklog_activate: true,
        worklog_timeLogged: "2"
      }
    });
  }
}
