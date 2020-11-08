import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'humanDuration',
})
export class HumanDurationPipe implements PipeTransform {
  transform(seconds: number): string {
    return moment.duration(seconds, 'seconds').humanize();
  }
}
