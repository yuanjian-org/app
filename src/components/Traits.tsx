import { MenteeTraitsPreference } from "shared/Traits";

import { Traits, zTraits } from "shared/Traits";
import ModalWithBackdrop from "./ModalWithBackdrop";
import {
  Button,
  Text,
  ModalFooter,
  ModalBody,
  ModalHeader,
  ModalContent,
  SimpleGrid,
  GridItem,
  Slider,
  SliderTrack,
  SliderThumb,
  SliderMark,
  Textarea,
} from "@chakra-ui/react";
import { breakpoint, componentSpacing, sectionSpacing } from "theme/metrics";
import invariant from "tiny-invariant";
import { useEffect, useState } from "react";
import trpc, { trpcNext } from "trpc";
import { useUserContext } from "UserContext";
import _ from "lodash";
import { UserProfile } from "shared/UserProfile";

export const traitsType: {
  title: string, 
  field: keyof Traits, 
  labels: string[] 
}[] = [
  { title: "来自", field: "农村vs城市", labels: ["农村", "城市"] },
  { title: "沟通", field: "内敛vs外向", labels: ["内敛", "外向"] },
  { title: "关系", field: "慢热vs快热", labels: ["慢热", "快热"] },
  { title: "追求", field: "安逸vs奋斗", labels: ["安逸", "奋斗"] },
  { title: "个性", field: "顺从vs独立", labels: ["顺从", "独立"] },
  { title: "风格", field: "思考者vs实干家", labels: ["思考者", "实干家"] },
  { title: "职业", field: "创业vs大厂", labels: ["创业", "大厂"] },
  { title: "方向", field: "科研vs非科研", labels: ["科研", "非科研"] },
];

export const traitMaxScore = 2;
export const hardTraitPreferenceScore = 1000;
export const softTraitPreferenceScore = 2;

export const leastMatchingScore = 999;

// If no preference is specified, place the mentee-mentor pair after those
// with good matching scores but before those with bad matching scores.
// Use 2 here because a mismatching trait has a score of at least 3, and a
// matching trait has a score of at most 1.
export const noPreferenceMatchingScore = 2;

function isHardPref(pv: number) {
  return Math.abs(pv) === hardTraitPreferenceScore;
}

/**
 * The higher the score, the less matching the mentee and mentor are.
 */
export function computeMatchingScore(
  profile: UserProfile,
  pref?: MenteeTraitsPreference,
): number {
  const traits = profile.特质;
  if (!pref || !traits) return noPreferenceMatchingScore;

  let score = 0;
  let count = 0;

  // TODO: organized them into an array first

  if (pref.男vs女 !== undefined) {
    // N.B. Sign must be consistent with what's defined in /profiles/[userId]
    const sexScore = profile.性别 === "男" ? -2 : 2;
    if (isHardPref(pref.男vs女)) {
      if (sexScore * pref.男vs女 < 0) return leastMatchingScore;
      // else score += 0;
    } else {
      score += Math.abs(pref.男vs女 - sexScore);
    }
    count++;
  }

  // TODO: Add 年级

  for (const key in zTraits.shape) {
    if (key === "其他") continue;
    const pv = pref[key as keyof MenteeTraitsPreference];
    const tv = traits[key as keyof Traits];
    if (pv === undefined || tv === undefined) continue;
    invariant(typeof pv === "number" && typeof tv === "number");

    if (isHardPref(pv)) {
      if (tv * pv < 0) return leastMatchingScore;
      // else score += 0;
    } else {
      score += Math.abs(pv - tv);
    }

    count++;
  }

  return count ? score / count : noPreferenceMatchingScore;
}

export function isTraitsComplete(traits: Traits | undefined) {
  return traits && Object.keys(zTraits.shape)
    .filter(k => k !== "其他")
    .every(k => k in traits);
}

export function isMentorRecommended(traitsMatchingScore?: number) {
  return traitsMatchingScore !== undefined &&
    traitsMatchingScore < noPreferenceMatchingScore;
}

export function TraitsModal({ onClose }: {
  onClose: () => void,
}) {
  const [me] = useUserContext();
  const { data } = trpcNext.users.getUserProfile.useQuery({ userId: me.id });

  const [traits, setTraits] = useState<Traits>();
  useEffect(() => setTraits(data?.profile?.特质 ?? {}), [data]);

  const update = async (field: keyof Traits, value: number | string) => {
    const v = { ...traits, [field]: value };
    setTraits(v);
    await trpc.users.setUserProfile.mutate({
      userId: me.id,
      profile: { ...data?.profile, 特质: v },
    });
  };

  return <ModalWithBackdrop isOpen size="xl" onClose={() => undefined}>
    <ModalContent>
      <ModalHeader>填写你的个人特点，让系统为你推荐导师</ModalHeader>

      <ModalBody>
        {traits && <SimpleGrid
          columns={4}
          templateColumns="auto auto 1fr auto"
          gap={componentSpacing}
          rowGap={sectionSpacing}
          m={sectionSpacing}
        >
          {/* First row */}
          <GridItem />
          <GridItem colSpan={3} 
            mx={{ base: "auto", [breakpoint]: "4em" }}
            textAlign="center"
            fontSize='sm'
            color="gray"
          >
            点击滑轨选择倾向。越接近两端则倾向程度越高。若无倾向或不确认，请点击滑轨中央。
          </GridItem>

          {/* Traits */}
          {traitsType.map(({ title, field, labels }, i) => 
            <Trait
              key={i}
              title={title}
              labels={labels} 
              value={traits[field] as number | undefined}
              update={v => update(field, v)}
            />
          )}

          <OtherTrait
            value={traits.其他 ?? ""}
            update={v => update("其他", v)}
          />

        </SimpleGrid>}
      </ModalBody>

      <ModalFooter>
        <Button
          isDisabled={!isTraitsComplete(traits)}
          variant='brand'
          onClick={onClose}
        >
          确认
        </Button>
      </ModalFooter>
    </ModalContent>

  </ModalWithBackdrop>;
}

function Trait({ title, labels, value, update }: {
  title: string,
  labels: string[],
  value: number | undefined,
  update: (value: number) => void,
}) {
  invariant(labels.length == 2);

  return <>
    <GridItem
      // Vertically center the text
      display="flex" alignItems="center"
    >
      <Text>{title}：</Text>
    </GridItem>
    <GridItem>
      <Text textAlign="end"><b>{labels[0]}</b></Text>
    </GridItem>
    <GridItem>
      <Slider
        min={-traitMaxScore} max={traitMaxScore} step={1}
        // Without the NaN, the slider will not update when user clicks on the
        // center of the slider.
        value={value === undefined ? Number.NaN : value}
        onChange={update}
      >
        <SliderTrack />

        {_.range(-traitMaxScore, traitMaxScore + 1).map(v =>
          <SliderMark key={v} value={v} mt={2}>
            <Text size="xs" color="gray.200">|</Text>
          </SliderMark>
        )}

        <SliderThumb
          bg="brand.b"
          opacity={value !== undefined ? 1 : 0}
        />
      </Slider>
    </GridItem>
    <GridItem>
      <Text><b>{labels[1]}</b></Text>
    </GridItem>
  </>;
}

function OtherTrait({ value, update }: {
  value: string,
  update: (value: string) => void,
}) {
  return <>
    <GridItem
      // Vertically center the text
      display="flex" alignItems="center"
    >
      <Text>其他：</Text>
    </GridItem>
    <GridItem colSpan={3} mt={componentSpacing}>
      <Textarea
        placeholder="比如业余爱好、其他性格特点、希望导师具备的性格和爱好等"
        height="2em"
        value={value}
        onChange={e => update(e.target.value)}
      />
    </GridItem>
  </>;
}