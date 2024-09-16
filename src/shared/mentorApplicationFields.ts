export type MentorApplicationField = {
  name: string,

  // Always show the field on the "edit application" page even if the field is
  // absent from application data.
  showForEdits?: boolean,

  // field name from volunteer application form https://jsj.top/f/OzuvWD
  jsjField?: string,
};

/**
 * Field order dictates the order the fields are displayed.
 */
const mentorApplicationFields: MentorApplicationField[] = [
  { name: "其他申请信息尚未实现", showForEdits: true },
];

export default mentorApplicationFields;
