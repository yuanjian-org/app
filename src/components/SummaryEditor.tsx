import { Button, Textarea, Text, VStack, Link, HStack, Spacer } from '@chakra-ui/react';
import { ModalFooter } from '@chakra-ui/react';
import { ModalCloseButton } from '@chakra-ui/react';
import { ModalHeader } from '@chakra-ui/react';
import { ModalBody } from '@chakra-ui/react';
import { computeDeletion, maxDeletionRatio, Summary } from 'shared/Summary';
import ModalWithBackdrop from './ModalWithBackdrop';
import { ModalContent } from '@chakra-ui/react';
import { useState } from 'react';
import trpc, { trpcNext } from 'trpc';
import { toast } from 'react-toastify';
import { breakpoint, componentSpacing } from 'theme/metrics';
import { cmdOrCtrlChar } from 'macOrWin';
import MarkdownSupport from './MarkdownSupport';
import useMobile from 'useMobile';

export default function SummaryEditor({ summary, onClose }: {
  summary: Summary,
  onClose: () => void,
}) {
  const [markdown, setMarkdown] = useState(summary.markdown);
  const [saving, setSaving] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const { deleted, totalDeletedLength, allowed } = computeDeletion(summary,
    markdown);
  const deletedRatio = (totalDeletedLength / summary.initialLength * 100)
    .toFixed(1);

  const isMobile = useMobile();
  const utils = trpcNext.useContext();

  const save = async () => {
    setSaving(true);
    try {
      await trpc.summaries.update.mutate({
        transcriptId: summary.transcriptId,
        key: summary.key,
        markdown,
      });
      await utils.summaries.list.invalidate();

      toast.success('会议纪要已更新。');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return <ModalWithBackdrop
    isOpen
    size={{ base: 'full', [breakpoint]: '6xl' }}
    scrollBehavior="outside"
    onClose={() => undefined}
  >
    <ModalContent>
      <ModalHeader>编辑会议纪要</ModalHeader>
      <ModalBody>
        <VStack align='start' spacing={componentSpacing}>
          <Text>
            ⚠️ 因合规性的要求，被删除的纪要文字会以<b>完全匿名</b>的方式保存在系统后台。{
            }同时，累计删除字数不得超过总字数的 <b>{maxDeletionRatio * 100}%</b>。
            <Link 
              onClick={() => setShowDeleted(true)}
              color={allowed ? undefined : 'red'}
            >
              累计删除：
              <b>{deletedRatio}%</b>
            </Link>
          </Text>

          {showDeleted && (
            <DeletedContentModal
              deleted={deleted}
              onClose={() => setShowDeleted(false)}
            />
          )}

          <Textarea
            defaultValue={summary.markdown}
            onChange={e => setMarkdown(e.target.value)}
            height="68vh"
          />
        </VStack>
      </ModalBody>

      <ModalFooter>
        <HStack w="full" gap={componentSpacing}>
          {!allowed && (
            <Text color="red">
              累计删除过多。请
              {isMobile ? "摇摇手机" : `按 ${cmdOrCtrlChar()} + Z `}恢复被删的文字。
            </Text>
          )}
          <Spacer />
          {(allowed || !isMobile) && <MarkdownSupport />}
          <Button onClick={onClose}>取消</Button>
          {(allowed || !isMobile) && <Button
            variant='brand' 
            onClick={save}
            isLoading={saving} 
            isDisabled={!allowed}
          >保存</Button>}
        </HStack>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}

function DeletedContentModal({ deleted, onClose }: {
  deleted: string[],
  onClose: () => void,
}) {

  return <ModalWithBackdrop isOpen onClose={onClose} size="4xl">
    <ModalContent>
      <ModalHeader>本次编辑待删除内容</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack align='start' spacing={componentSpacing}>
          <Text fontWeight="bold">
            保存本次编辑后，以下内容将从纪要中删除，并以匿名的方式保存在系统后台：
          </Text>

          {!deleted.length && <Text>（尚没有删除任何内容）</Text>}

          {deleted.map((str, idx) => (
            <Text key={idx}>
              {/* This is a big quotation mark */}
              <Text display="inline" color="gray">❝</Text>
              {str}
            </Text>
          ))}
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button variant='brand' onClick={onClose}>关闭</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
