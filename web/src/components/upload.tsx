import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import Wrapper from '@/components/wrapper.tsx';
import UploadField from '@/components/upload-field.tsx';
import { cn } from '@/utils/shadcn.ts';
import { useEffect, useState } from 'react';
import type { Nullish } from '@/types/common.ts';

const uploadVariants = cva('w-full flex py-4 gap-4');

export type UploadProps = Omit<React.ComponentProps<'div'>, 'children' | 'onChange'> &
  VariantProps<typeof uploadVariants> & {
    files: Nullish<File[]>;
    onChange: (files: File[]) => void;
  };

export default function Upload({ className, files, onChange, ...props }: UploadProps) {
  const fieldClassName: string = 'w-1/2';

  const [file1, setFile1] = useState<Nullish<File>>(null);
  const [file2, setFile2] = useState<Nullish<File>>(null);

  useEffect(() => {
    if (!file1 || !file2) {
      return;
    }

    onChange([file1, file2]);
  }, [file1, file2, onChange]);

  return (
    <Wrapper
      title={!files || !files?.length ? '비교할 2개의 파일을 업로드해주세요' : '아래 버튼을 눌러 비교를 시작해주세요'}
    >
      <div className={cn(uploadVariants(), className)} {...props}>
        <UploadField className={fieldClassName} file={file1} onChange={setFile1} />
        <UploadField className={fieldClassName} file={file2} onChange={setFile2} />
      </div>
    </Wrapper>
  );
}
