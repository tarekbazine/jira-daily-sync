import { HumanDurationPipe } from './human-duration.pipe';

describe('HumanDurationPipe', () => {
  it('create an instance', () => {
    const pipe = new HumanDurationPipe();
    expect(pipe).toBeTruthy();
  });
});
