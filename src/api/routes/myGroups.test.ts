import moment from "moment";
import { expect } from 'chai';
import { meetingLinkIsExpired } from "./myGroups";

describe('myGroups/meetingLinkIsExpired', () => {
  it('should return true', async () => {
    // input a meeting link date that was created 31 days ago
    const result = meetingLinkIsExpired(moment().subtract(31, 'days').toDate());

    // Assert
    // a meeting link that is created 31 days agao should be expired and return true
    expect(result).equal(true);
  });

  it('should return false', async () => {
    // input a meeting link date that was created 15 days ago
    const result = meetingLinkIsExpired(moment().subtract(15, 'days').toDate(),);

    // Assert
    // a meeting link that is created 15 days agao should be valid and return false
    expect(result).equal(false);
  });
});


