import {
  Box,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Editable,
  EditablePreview,
  EditableInput,
  useEditableControls,
  ButtonGroup,
  IconButton,
  HStack,
  GridItem,
  Grid,
  VStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import trpc from "../trpc";
import { CheckIcon, CloseIcon, EditIcon } from '@chakra-ui/icons';
import { useUserContext } from 'UserContext';
import Loader from 'components/Loader';

// Dedupe code with index.tsx:SetNameModal
export default function Page() {
  const [user, setUser] = useUserContext();
  const [isLoading, setIsLoading] = useState(false);

  const name = user.name || '';

  const handleSubmit = async (newName: string) => {
    if (!newName) return;

    setIsLoading(true);
    try {
      const updatedUser = structuredClone(user);
      updatedUser.name = newName;
      await trpc.users.update.mutate(updatedUser);
      setUser(updatedUser);
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: Use EditableWithIcon
  const EditableControls = () => {
    const {
      isEditing,
      getSubmitButtonProps,
      getCancelButtonProps,
      getEditButtonProps,
    } = useEditableControls();

    return isEditing ? (
      <ButtonGroup justifyContent='center' size='sm'>
        <IconButton aria-label='confirm name change button' icon={<CheckIcon />} {...getSubmitButtonProps()} />
        <IconButton aria-label='cancel name change button' icon={<CloseIcon />} {...getCancelButtonProps()} />
      </ButtonGroup>
    ) : (
      <ButtonGroup justifyContent='center' size='sm'>
        <IconButton aria-label='edit name button' size='sm' icon={<EditIcon />} {...getEditButtonProps()} />
      </ButtonGroup>
    );
  };

  // TODO: Use one grid for the whole page
  const EmailField = () => {
    return (
      <FormControl>
        <Grid templateColumns="100px 1fr">
          <GridItem>
            <FormLabel>邮箱</FormLabel>
          </GridItem>
          <GridItem>
            {user.email}
          </GridItem>
          <GridItem />
          <GridItem fontSize="sm" color="grey">
            如需更改邮箱，请联系系统管理员
          </GridItem>
        </Grid>
      </FormControl>
    );
  };

  const NameField = () => {
    return (
      <FormControl isInvalid={!name}>
        <Grid templateColumns="100px 1fr">
          <GridItem>
            <FormLabel marginTop='5px'>中文全名</FormLabel>
          </GridItem>
          <GridItem>
              <Editable 
                defaultValue={name}
                onSubmit={(newName) => handleSubmit(newName)}
              >
                <HStack>
                  <Box>
                    <EditablePreview />
                    <EditableInput 
                      backgroundColor={isLoading ? 'brandscheme' : 'white'}
                    />
                  </Box>
                  <Box>
                    <EditableControls />
                  </Box>
                </HStack>
              </Editable>
          </GridItem>
        </Grid>
        <FormErrorMessage>用户姓名不能为空</FormErrorMessage>
      </FormControl>
    );
  };

  return (
    <VStack spacing={4}>
      <EmailField />
      <NameField />
      {isLoading && <Loader loadingText='保存中...'/>}
    </VStack>
  );
};
