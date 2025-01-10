import {
  hardTraitPrefAbsValue,
  isTraitsComplete,
  maxTraitAbsValue,
  softTraitPrefAbsValue,
  TraitsPreference,
} from "shared/Traits";
import { Traits } from "shared/Traits";
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
  WrapItem,
  Tag,
  ModalCloseButton,
} from "@chakra-ui/react";
import { breakpoint, componentSpacing, sectionSpacing } from "theme/metrics";
import invariant from "tiny-invariant";
import { useEffect, useState } from "react";
import trpc, { trpcNext } from "trpc";
import _ from "lodash";
import { useMyId } from "useMe";

export const traitsProfiles: {
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
  { title: "职业", field: "创业vs大厂", labels: ["创业", "就业"] },
  { title: "学术", field: "科研vs非科研", labels: ["科研", "非科研"] },
];

export const traitsPrefProfiles: { 
  title: string, 
  field: keyof TraitsPreference, 
  labels: string[] 
}[] = [
  { title: "性别", field: "男vs女", labels: ["男生", "女生", "仅匹配男生", "仅匹配女生"] },
  { title: "年级", field: "低年级vs高年级", labels: ["低年级", "高年级"] },
  ...traitsProfiles,
];

// The value of each label in the above traits preference profile.
export const traitsPrefLabel2value = [
  -softTraitPrefAbsValue, softTraitPrefAbsValue,
  -hardTraitPrefAbsValue, hardTraitPrefAbsValue,
];

// A tag for displaying a trait. Should be used in a Wrap component.
export function TraitTag({ label, selected, onClick } : {
  label: string,
  selected: boolean,
  onClick?: () => void
}) {
  return <WrapItem>
    <Tag 
      size="lg"
      borderRadius='full'
      bgColor={selected ? "gray.600" : "gray.200"}
      color={selected ? "white" : "gray.600"}
      cursor={onClick ? "pointer" : undefined}
      onClick={onClick}
    >
      {label}
    </Tag>
  </WrapItem>;
}

export function TraitsModal({ onClose }: {
  onClose: () => void,
}) {
  const myId = useMyId();
  const { data } = trpcNext.users.getUserProfile.useQuery({ userId: myId });

  const [traits, setTraits] = useState<Traits>();
  useEffect(() => setTraits(data?.profile?.特质 ?? {}), [data]);

  const update = async (field: keyof Traits, value: number | string) => {
    const v = { ...traits, [field]: value };
    setTraits(v);
    await trpc.users.setUserProfile.mutate({
      userId: myId,
      profile: { ...data?.profile, 特质: v },
    });
  };

  const complete = isTraitsComplete(traits);

  return <ModalWithBackdrop isOpen size="xl" onClose={() => {
    if (complete) onClose();
  }}>
    <ModalContent>
      <ModalHeader>填写你的个人特质，让系统为你推荐导师</ModalHeader>
      <ModalCloseButton disabled={!complete} />

      <ModalBody>
        {traits && <SimpleGrid
          columns={4}
          templateColumns="auto auto 1fr auto"
          gap={componentSpacing}
          rowGap={sectionSpacing}
        >
          {/* First row */}
          <GridItem />
          <GridItem colSpan={3} 
            mx={{ base: "auto", [breakpoint]: "4em" }}
            textAlign="center"
            fontSize='sm'
            color="gray"
          >
            点击滑轨选择倾向。越接近两侧则倾向程度越高。如果不确定或无明显倾向，点击滑轨中央。
          </GridItem>

          {/* Traits */}
          {traitsProfiles.map(({ title, field, labels }, i) => 
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
          isDisabled={!complete}
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
        min={-maxTraitAbsValue} max={maxTraitAbsValue} step={1}
        // Without the NaN, the slider will not update when user clicks on the
        // center of the slider.
        value={value === undefined ? Number.NaN : value}
        onChange={update}
      >
        <SliderTrack />

        {_.range(-maxTraitAbsValue, maxTraitAbsValue + 1).map(v =>
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