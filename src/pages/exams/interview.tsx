import { fullPage } from "AppPage";
import { JinshujuForm } from "pages/form";
import { encodeXField } from "shared/jinshuju";
import useMe from "useMe";

export default fullPage(() => {
  const me = useMe();
  const x = encodeXField(me, me.id);
  return <JinshujuForm formId="w02l95" urlSafeXField={x} />;
}, "《面试流程和标准》评测");
