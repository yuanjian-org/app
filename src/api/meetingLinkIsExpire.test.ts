import moment from "moment";
import { expect } from 'chai';
//import { meetingLinkIsExpired } from "./routes/myGroups";

// Testing using a simpler Group type than the complete model
interface Group {
    meetingLink: string,
    deletedAt: Date | null,
    id: string,
    createdAt: Date,
    updatedAt: Date,
}

// Same function in myGroups with different input Group type
function meetingLinkIsExpired(group: Group) {
    return moment() > moment(group.updatedAt).add(30, 'days');
}

describe('meetingLinkIsExpired', () => {
    it('should return true', async () => {
        // a group that was updated 31 days ago should be expired
        const expiredLinkGroup: Group = ({
            meetingLink: "dummy",
            deletedAt: null,
            id: "expired link group",
            createdAt: moment().subtract(31, 'days').toDate(),
            updatedAt: moment().subtract(31, 'days').toDate(),
        })

        // Act
        const result = meetingLinkIsExpired(expiredLinkGroup);

        // Assert
        expect(result).equal(true);

    });

    it('should return false', async () => {
        // a group that was updated 15 days ago is not expired
        const validLinkGroup: Group = {
            meetingLink: "dummy",
            deletedAt: null,
            id: "valid link group",
            createdAt: moment().subtract(31, 'days').toDate(),
            updatedAt: moment().subtract(15, 'days').toDate(),
        }

        // Act
        const result = meetingLinkIsExpired(validLinkGroup);

        // Assert
        expect(result).equal(false);

    });

});


