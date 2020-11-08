import { Pipe, PipeTransform } from '@angular/core';
import { IssueModel } from '../../models';

@Pipe({
  name: 'getStatus',
})
export class GetStatusPipe implements PipeTransform {
  transform(issue: IssueModel, date: string): string[] {
    if (issue.changelogPerDay.hasOwnProperty(date)) {
      return issue.changelogPerDay[date];
    }

    return [issue.status];
  }
}
