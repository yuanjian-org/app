import T from "components/T";
import { FormControl, FormLabel, Input, Textarea } from "@chakra-ui/react";
import FormHelperTextWithMargin from "./FormHelperTextWithMargin";
import { UserProfile } from "shared/UserProfile";
export default function MenteeProfileFields({
  profile,
  updateProfile,
  showIsRequired,
}: {
  profile: Partial<UserProfile>;
  updateProfile: (k: keyof UserProfile, v: string) => void;
  showIsRequired?: boolean;
}) {
  return (
    <>
      <FormControl isRequired={showIsRequired}>
        <FormLabel>
          <T>毕业高中</T>
        </FormLabel>
        <Input
          bg="white"
          value={profile.毕业高中 || ""}
          onChange={(ev) => updateProfile("毕业高中", ev.target.value)}
        />
      </FormControl>

      <FormControl isRequired={showIsRequired}>
        <FormLabel>
          <T>大学</T>
        </FormLabel>
        <Input
          bg="white"
          value={profile.大学 || ""}
          onChange={(ev) => updateProfile("大学", ev.target.value)}
        />
      </FormControl>

      <FormControl isRequired={showIsRequired}>
        <FormLabel>
          <T>就读专业</T>
        </FormLabel>
        <Input
          bg="white"
          value={profile.就读专业 || ""}
          onChange={(ev) => updateProfile("就读专业", ev.target.value)}
        />
      </FormControl>

      <FormControl isRequired={showIsRequired}>
        <FormLabel>
          <T>大一入读年份</T>
        </FormLabel>
        <Input
          bg="white"
          value={profile.大一入读年份 || ""}
          onChange={(ev) => updateProfile("大一入读年份", ev.target.value)}
        />
      </FormControl>

      <FormControl isRequired={showIsRequired}>
        <FormLabel>
          <T>现就读阶段</T>
        </FormLabel>
        <FormHelperTextWithMargin>
          <T>本科、专科、硕博连读等</T>
        </FormHelperTextWithMargin>
        <Input
          bg="white"
          value={profile.现就读阶段 || ""}
          onChange={(ev) => updateProfile("现就读阶段", ev.target.value)}
        />
      </FormControl>

      <FormControl isRequired={showIsRequired}>
        <FormLabel>
          <T>自我介绍</T>
        </FormLabel>
        <FormHelperTextWithMargin>
          <T>为什么要寻求帮助，未来你会如何回馈他人</T>
        </FormHelperTextWithMargin>
        <Textarea
          bg="white"
          height={140}
          value={profile.自我介绍 || ""}
          onChange={(ev) => updateProfile("自我介绍", ev.target.value)}
        />
      </FormControl>
    </>
  );
}
