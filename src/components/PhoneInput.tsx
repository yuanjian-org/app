import { useState, useMemo, useEffect, ChangeEvent } from "react";
import {
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  HStack,
  Text,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import countryAreaCodes from "./countryAreaCodes.json";

export interface CountryAreaCode {
  flag: string;
  name: string;
  code: string;
}

function getCountryAreaCodes(): CountryAreaCode[] {
  return countryAreaCodes;
}

/**
 * Use standard E.164 phone number format such as "+8613800138000".
 */
export default function PhoneInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [country, setCountry] = useState<CountryAreaCode>();
  const [number, setNumber] = useState<string>("");
  const list = useMemo(() => getCountryAreaCodes(), []);

  useEffect(() => {
    if (country) return;
    if (value) {
      const c = list.find((country) => value.startsWith(country.code));
      if (c) {
        setCountry(c);
        setNumber(value.slice(c.code.length));
        return;
      }
    }

    // Fallthrough
    setNumber("");
    setCountry(list[0]);
  }, [country, list, number, value]);

  const changeCountry = (c: CountryAreaCode) => {
    setCountry(c);
    onChange(c.code + number);
  };

  const changeNumber = (e: ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value;
    setNumber(n);
    if (country) {
      onChange(country.code + n);
    }
  };

  return (
    <HStack spacing={2}>
      <Menu>
        <MenuButton
          as={Button}
          rightIcon={<ChevronDownIcon />}
          variant="outline"
          minW="120px"
          aria-label="选择国家或地区代码"
        >
          <HStack spacing={1}>
            <Text>{country?.flag}</Text>
            <Text fontSize="sm">{country?.code}</Text>
          </HStack>
        </MenuButton>
        <MenuList maxHeight="100px" overflowY="auto">
          {list.map((country, index) => (
            <MenuItem key={`${index}`} onClick={() => changeCountry(country)}>
              <HStack w="full">
                <Text flex={1}>
                  {country.flag} {country.name}
                </Text>
                <Text fontSize="sm" color="gray">
                  {country.code}
                </Text>
              </HStack>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
      <Input
        value={number}
        onChange={changeNumber}
        type="tel"
        placeholder="手机号"
      />
    </HStack>
  );
}
