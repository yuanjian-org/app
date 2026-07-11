import { whiteLabel } from "shared/WhiteLabel";

export default function ProjectsLabel() {
  return <>{whiteLabel === "x" ? "X-Challenge 问题" : "科研项目"}</>;
}
