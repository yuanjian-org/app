export type MenteeApplicationField = {
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
const mentorApplicationFields: MenteeApplicationField[] = [
  { name: "尚未实现其他申请信息的显示", showForEdits: true },
];

export default mentorApplicationFields;
