import { widePage } from "AppPage";
import { MentorPage } from "../mentors";

export default widePage(
  () => <MentorPage type="RelationalMentor" title="浏览一对一导师" />,
  "浏览一对一导师"
);
