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
        <FormLabel>毕业高中</FormLabel>
        <Input
          bg="white"
          value={profile.毕业高中 || ""}
          onChange={(ev) => updateProfile("毕业高中", ev.target.value)}
        />
      </FormControl>

      <FormControl isRequired={showIsRequired}>
        <FormLabel>大学</FormLabel>
        <Input
          bg="white"
          value={profile.大学 || ""}
          onChange={(ev) => updateProfile("大学", ev.target.value)}
        />
      </FormControl>

      <FormControl isRequired={showIsRequired}>
        <FormLabel>就读专业</FormLabel>
        <Input
          bg="white"
          value={profile.就读专业 || ""}
          onChange={(ev) => updateProfile("就读专业", ev.target.value)}
        />
      </FormControl>

      <FormControl isRequired={showIsRequired}>
        <FormLabel>大一入读年份</FormLabel>
        <Input
          bg="white"
          value={profile.大一入读年份 || ""}
          onChange={(ev) => updateProfile("大一入读年份", ev.target.value)}
        />
      </FormControl>

      <FormControl isRequired={showIsRequired}>
        <FormLabel>现就读阶段</FormLabel>
        <FormHelperTextWithMargin>
          本科、专科、硕博连读等
        </FormHelperTextWithMargin>
        <Input
          bg="white"
          value={profile.现就读阶段 || ""}
          onChange={(ev) => updateProfile("现就读阶段", ev.target.value)}
        />
      </FormControl>

      <FormControl isRequired={showIsRequired}>
        <FormLabel>自我介绍</FormLabel>
        <FormHelperTextWithMargin>
          为什么要寻求帮助，未来你会如何回馈他人
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
