import { fullPage } from "AppPage";
import { JinshujuForm } from "pages/form";
import { encodeXField } from "shared/jinshuju";
import useMe from "useMe";

export default fullPage(() => {
  const me = useMe();
  // Prefix the user's url to make it easier to identify the user when reading
  // feedback fields of the test on Jinshuju website.
  const x = encodeXField(me, me.id);
  return <JinshujuForm formId="wqPdKE" urlSafeXField={x} />;
}, "《导师手册》评测");
