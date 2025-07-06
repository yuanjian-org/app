import { minUserAttributes } from "../attributesAndIncludes";

export const landmarkAssessmentAttributes = ["score", "markdown", "createdAt"];

export const landmarkAssessmentInclude = [
  {
    association: "assessor",
    attributes: minUserAttributes,
  },
];
