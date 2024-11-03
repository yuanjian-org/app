import { expect } from 'chai';
import { redactEmail } from './users';

describe('redactEmail', () => {

  it('should redact email', () => {
    expect(redactEmail("foo.BAR+123@Gmail.Yahoo98_"))
      .equals("f**********@Gmail.Yahoo98_");
  });
});
