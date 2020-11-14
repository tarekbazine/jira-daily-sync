import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'humanDuration',
})
export class HumanDurationPipe implements PipeTransform {
  transform(seconds: number): string {
    if (seconds == null || seconds === 0) {
      return 'Not set';
    }

    return moment.duration(seconds, 'seconds').humanize();
  }
}
