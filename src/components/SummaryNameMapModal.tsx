import {
    Select,
    Button,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    FormControl,
    FormLabel,
    ModalOverlay,
    VStack
} from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import trpc, { trpcNext }  from "../trpc";
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import { MinUser } from 'shared/User';
import { TranscriptNameMap } from 'shared/Transcript';


export function SummaryNameMapModal({ transcriptNameMap, groupUsers, onClose }: {
    transcriptNameMap: TranscriptNameMap
    groupUsers: MinUser[]
    onClose: () => void,
}) {
    
    const [updatedNameMap, setUpdatedNameMap] = useState<{ [key: string]: MinUser }>({});

    useEffect(() => {
        let nameMap: { [key: string]: MinUser } = {};
        for (const e of transcriptNameMap) {
            const matchedUser = groupUsers.find(gu => gu.name && e.user && e.user.id.includes(gu.id));
            if (matchedUser && hasName(matchedUser)) {
                nameMap[e.handlebarName] = matchedUser;
            } else {
                nameMap[e.handlebarName] = e.user ? e.user : { name: e.handlebarName, id: '' };
            }
        }
        setUpdatedNameMap(nameMap);
    }, [transcriptNameMap, groupUsers]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, handlebar: string) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const selectedUserName = selectedOption.text;

        // if placeholder/ undefined value is selected
        if (!e.target.value) {
            // update the updatedUserMap
            setUpdatedNameMap(prevMap => ({
                ...prevMap,
                [handlebar]: { name: "", id: "" } // Reset to an empty state
            }));
        } else {
            setUpdatedNameMap(prevMap => ({
                ...prevMap,
                [handlebar]: { name: selectedUserName, id: e.target.value }
            }));
        }
    };

    const utils = trpcNext.useContext();

    const save = async () => {
        try {
            trpc.transcripts.updateNameMap.mutate(
                Object.entries(updatedNameMap) 
                .filter(([handlebar, user]) => user.id !== '')
                .map(([handlebar, user]) => ({
                  handlebarName: handlebar,
                  userId: user.id,
                })));
                utils.transcripts.getNameMap.invalidate();
                utils.summaries.invalidate();
        } finally {
            onClose();
        }
    };

    return (
        <ModalWithBackdrop isOpen onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>用户匹配 <ModalCloseButton /></ModalHeader>
                <FormControl>
                    <ModalBody>
                        <VStack spacing={4}>
                            {Object.entries(updatedNameMap || {}).map(([handlebar, groupUser]) => (
                                <FormControl key={handlebar}>
                                    <FormLabel htmlFor={handlebar}>{handlebar}</FormLabel>
                                    <Select
                                        id={handlebar}
                                        value={groupUser.id}
                                        placeholder='选择用户'
                                        onChange={(e) => handleSelectChange(e, handlebar)}
                                    >
                                        {groupUsers.map((gu) => (
                                            <option key={gu.id} value={gu.id}>
                                                {gu.name}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>
                            ))}
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme='brand' onClick={save}>
                            保存
                        </Button>
                    </ModalFooter>
                </FormControl>
            </ModalContent>
        </ModalWithBackdrop>
    );
}

// It will throw a type mismatch error if the name type is not updated
const hasName = (user: { name: string | null; id: string }): user is { name: string; id: string } => {
    return user.name !== null;
};
