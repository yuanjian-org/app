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
import trpc from "../trpc";
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import ReactMarkdown from 'react-markdown';
import { MinUser } from 'shared/User';
import { SummaryNameMap } from 'shared/Summary';

export function SummaryNameMapModal({ nameMap, groupUsers, onClose }: {
    nameMap: SummaryNameMap | undefined
    groupUsers: MinUser[]
    onClose: () => void,
}) {
    // UserMap = { [handlebar] : { name: [userName], id: [userId] }}
    // May update summaryNameMap API to output UserMap instead
    const [updatedUserMap, setUpdatedUserMap] = useState<{ [key: string]: SummaryNameMap }>({});

    useEffect(() => {
        let userMap: { [key: string]: SummaryNameMap } = {};
        for (const key in nameMap) {
            //NOTE: nameMap[key] has a format of **[name]**, thus nameMap[key] is used to call `includes`
            const matchedUser = groupUsers.find(gu => gu.name && nameMap[key].includes(gu.name));
            if (matchedUser && hasName(matchedUser)) {
                userMap[key] = matchedUser;
            } else {
                userMap[key] = { name: nameMap[key], id: '' };
            }
        }
        setUpdatedUserMap(userMap);
    }, [nameMap, groupUsers]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, handlebar: string) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const selectedUserName = selectedOption.text;

        // if placeholder/ undefined value is selected
        if (!e.target.value) {
            // update the updatedUserMap
            setUpdatedUserMap(prevMap => ({
                ...prevMap,
                [handlebar]: { name: "", id: "" } // Reset to an empty state
            }));
        } else {
            setUpdatedUserMap(prevMap => ({
                ...prevMap,
                [handlebar]: { name: selectedUserName, id: e.target.value }
            }));
        }
    };

    const save = async () => {
        try {
            trpc.transcripts.updateNameMap.mutate(
                Object.entries(updatedUserMap).reduce((acc: { [key: string]: string }, [handlebar, userMap]) => {
                    if (userMap.id) { acc[handlebar] = userMap.id; }
                    return acc;
                }, {})
            );
        } finally {
            onClose();
        }
    };

    return (
        <ModalWithBackdrop isOpen onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>用户匹配</ModalHeader>
                <ModalCloseButton />
                <FormControl>
                    <ModalBody>
                        <VStack spacing={4}>
                            {Object.entries(updatedUserMap || {}).map(([handlebar, groupUser]) => (
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
